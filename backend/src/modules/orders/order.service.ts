import { HttpError } from '../../lib/httpError';
import {
  createOrder,
  getOrders,
  updateOrderStatus,
  getOrderById,
  createReturnRecord,
  getCreditHoldOrders,
  releaseCreditHold,
  getReturnsByDistributor
} from './order.repository';
import type { Order, OrderStatus } from './order.types';
import type { Request } from 'express';
import {
  getDistributorCredit,
  incrementOutstandingBalance
} from '../distributors/distributor.repository';
import { sendNotification } from '../notifications/notification.service';
import { recordAuditEvent } from '../audit/audit.service';
import { emitIntegrationEvent } from '../integrations/integration.service';

const allowedTransitions: Record<OrderStatus, OrderStatus[]> = {
  draft: ['submitted', 'cancelled'],
  submitted: ['approved', 'rejected', 'cancelled'],
  approved: ['dispatched', 'cancelled'],
  rejected: [],
  dispatched: ['delivered'],
  delivered: ['returned'],
  returned: [],
  cancelled: []
};

interface ListOrdersInput {
  distributorId?: string;
  status?: OrderStatus;
  limit?: number;
  offset?: number;
}

interface CreateOrderInput {
  distributorId?: string;
  retailerId?: string;
  salesRepId?: string;
  currency: string;
  items: Array<{
    productId: string;
    quantity: number;
    unitPrice: number;
    schemeId?: string;
    discountAmount?: number;
  }>;
  notes?: string;
}

const resolveDistributorScope = (
  user: Request['user'] | undefined,
  requested?: string
): string => {
  if (!user) {
    throw new HttpError(401, 'Authentication required');
  }
  if (user.role === 'admin') {
    if (!requested) {
      throw new HttpError(400, 'distributorId is required');
    }
    return requested;
  }
  const scopedId = user.distributorId;
  if (!scopedId) {
    throw new HttpError(403, 'No distributor scope assigned');
  }
  if (requested && requested !== scopedId) {
    throw new HttpError(403, 'Access to requested distributor denied');
  }
  return scopedId;
};

const defaultSalesRep = (
  user: Request['user'] | undefined,
  provided?: string
): string | undefined => {
  if (provided) return provided;
  if (!user) return undefined;
  if (user.role === 'field_rep') {
    return user.id;
  }
  return undefined;
};

export const listOrders = async (
  input: ListOrdersInput,
  user: Request['user'] | undefined
): Promise<Order[]> => {
  const distributorId = resolveDistributorScope(user, input.distributorId);
  return await getOrders(distributorId, input.status, input.limit, input.offset);
};

export const listCreditHolds = async (
  user: Request['user'] | undefined,
  limit?: number,
  offset?: number
): Promise<Order[]> => {
  if (!user || user.role !== 'admin') {
    throw new HttpError(403, 'Admin access required');
  }
  return await getCreditHoldOrders(limit, offset);
};

export const createNewOrder = async (
  input: CreateOrderInput,
  user: Request['user'] | undefined
): Promise<Order> => {
  const distributorId = resolveDistributorScope(user, input.distributorId);
  if (input.items.length === 0) {
    throw new HttpError(400, 'Order must contain at least one item');
  }
  const distributor = await getDistributorCredit(distributorId);
  if (!distributor) {
    throw new HttpError(404, 'Distributor not found');
  }
  const totalAmount = input.items.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice - (item.discountAmount ?? 0),
    0
  );
  const availableCredit =
    Number(distributor.creditLimit ?? 0) - Number(distributor.outstandingBalance ?? 0);
  const creditHoldFlag = totalAmount > availableCredit;
  const salesRepId = defaultSalesRep(user, input.salesRepId);
  const order = await createOrder({
    ...input,
    distributorId,
    salesRepId,
    totalAmount,
    creditHoldFlag
  });
  if (!creditHoldFlag) {
    await incrementOutstandingBalance(distributorId, totalAmount);
  } else {
    await sendNotification({
      subject: 'Order placed on credit hold',
      body: `Order ${order.id} exceeded credit limit for distributor ${distributorId}.`,
      recipient: user?.email
    });
  }
  await emitIntegrationEvent('order.created', {
    orderId: order.id,
    distributorId,
    totalAmount,
    creditHoldFlag
  });
  await recordAuditEvent({
    action: 'order.created',
    resource: 'order',
    userId: user?.id ?? null,
    metadata: { orderId: order.id, distributorId }
  });
  return order;
};

export const transitionOrderStatus = async (
  id: string,
  status: OrderStatus,
  comment: string | undefined,
  user: Request['user'] | undefined
): Promise<Order> => {
  const existing = await getOrderById(id);
  if (!existing) {
    throw new HttpError(404, 'Order not found');
  }
  if (existing.status === status) {
    return existing;
  }
  const validStatuses = allowedTransitions[existing.status];
  if (!validStatuses?.includes(status)) {
    throw new HttpError(
      409,
      `Transition from ${existing.status} to ${status} not allowed`
    );
  }
  const updated = await updateOrderStatus(id, status, comment);
  const eventByStatus: Partial<Record<OrderStatus, string>> = {
    dispatched: 'order.shipped',
    delivered: 'order.delivered',
    returned: 'order.returned'
  };
  const eventType = eventByStatus[status];
  if (eventType) {
    await emitIntegrationEvent(eventType, {
      orderId: id,
      status,
      previousStatus: existing.status
    });
  }
  await recordAuditEvent({
    action: 'order.status_changed',
    resource: 'order',
    userId: user?.id ?? null,
    metadata: { orderId: id, from: existing.status, to: status }
  });
  return updated;
};

export const createReturnRequest = async (
  orderId: string,
  reason: string,
  refundAmount: number,
  user: Request['user'] | undefined
): Promise<void> => {
  const order = await getOrderById(orderId);
  if (!order) {
    throw new HttpError(404, 'Order not found');
  }
  const distributorId = resolveDistributorScope(user, order.distributorId);
  if (order.status !== 'delivered') {
    throw new HttpError(400, 'Only delivered orders can be returned');
  }
  if (refundAmount < 0) {
    throw new HttpError(400, 'Refund amount must be positive');
  }
  await createReturnRecord({
    parentOrderId: order.id,
    distributorId,
    reason,
    refundAmount
  });
  await updateOrderStatus(orderId, 'returned');
  await recordAuditEvent({
    action: 'order.return_requested',
    resource: 'order',
    userId: user?.id ?? null,
    metadata: { orderId, refundAmount }
  });
};

export const releaseOrderCreditHold = async (
  orderId: string,
  user: Request['user'] | undefined
): Promise<Order> => {
  if (!user || user.role !== 'admin') {
    throw new HttpError(403, 'Admin access required');
  }
  const released = await releaseCreditHold(orderId);
  if (!released) throw new HttpError(404, 'Credit hold not found');
  await incrementOutstandingBalance(released.distributorId, Number(released.totalAmount ?? 0));
  await sendNotification({
    subject: 'Credit hold released',
    body: `Order ${released.id} credit hold cleared.`,
    recipient: user.email
  });
  await recordAuditEvent({
    action: 'order.credit_hold_released',
    resource: 'order',
    userId: user.id,
    metadata: { orderId: released.id }
  });
  return released;
};

export const listOrderReturns = async (
  user: Request['user'] | undefined,
  input: { distributorId?: string; limit?: number; offset?: number }
) => {
  const distributorId = resolveDistributorScope(user, input.distributorId);
  return await getReturnsByDistributor(distributorId, input.limit, input.offset);
};
