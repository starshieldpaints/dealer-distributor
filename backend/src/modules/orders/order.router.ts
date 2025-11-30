import { Router } from 'express';
import { validateRequest } from '../../middleware/validateRequest';
import { asyncHandler } from '../../utils/asyncHandler';
import { authorize } from '../../middleware/authorize';
import {
  listOrders,
  createNewOrder,
  transitionOrderStatus,
  createReturnRequest,
  listCreditHolds,
  releaseOrderCreditHold,
  listOrderReturns
} from './order.service';
import {
  createOrderSchema,
  listOrdersSchema,
  updateOrderStatusSchema
} from './order.schemas';
import { z } from 'zod';
import { requirePermission } from '../../middleware/permissions';

export const ordersRouter = Router();

ordersRouter.get(
  '/',
  requirePermission('orders:read'),
  validateRequest(listOrdersSchema),
  asyncHandler(async (req, res) => {
    const { distributorId, status, limit, offset } = req.query as Record<
      string,
      string
    >;
    const orders = await listOrders(
      {
        distributorId,
        status: status as any,
        limit: Number(limit),
        offset: Number(offset)
      },
      req.user
    );
    res.json({ data: orders });
  })
);

ordersRouter.get(
  '/credit-holds',
  requirePermission('orders:read'),
  authorize('admin'),
  asyncHandler(async (req, res) => {
    const { limit = '50', offset = '0' } = req.query as Record<string, string>;
    const holds = await listCreditHolds(req.user, Number(limit), Number(offset));
    res.json({ data: holds });
  })
);

ordersRouter.post(
  '/',
  requirePermission('orders:write'),
  validateRequest(createOrderSchema),
  asyncHandler(async (req, res) => {
    const order = await createNewOrder(req.body, req.user);
    res.status(201).json({ data: order });
  })
);

ordersRouter.patch(
  '/:id/status',
  requirePermission('orders:write'),
  validateRequest(updateOrderStatusSchema),
  asyncHandler(async (req, res) => {
    const updated = await transitionOrderStatus(
      req.params.id,
      req.body.status,
      req.body.comment,
      req.user
    );
    res.json({ data: updated });
  })
);

const returnSchema = {
  params: z.object({
    id: z.string().uuid()
  }),
  body: z.object({
    reason: z.string().min(3),
    refundAmount: z.number().nonnegative()
  })
};

ordersRouter.post(
  '/:id/returns',
  requirePermission('orders:write'),
  validateRequest(returnSchema),
  asyncHandler(async (req, res) => {
    await createReturnRequest(
      req.params.id,
      req.body.reason,
      req.body.refundAmount,
      req.user
    );
    res.status(201).json({ message: 'Return request submitted' });
  })
);

ordersRouter.post(
  '/:id/release-hold',
  requirePermission('orders:write'),
  authorize('admin'),
  asyncHandler(async (req, res) => {
    const order = await releaseOrderCreditHold(req.params.id, req.user);
    res.json({ data: order });
  })
);
ordersRouter.get(
  '/returns',
  requirePermission('orders:read'),
  asyncHandler(async (req, res) => {
    const { distributorId, limit = '20', offset = '0' } = req.query as Record<string, string>;
    const data = await listOrderReturns(req.user, {
      distributorId,
      limit: Number(limit),
      offset: Number(offset)
    });
    res.json({ data });
  })
);
