import { HttpError } from '../../lib/httpError';
import {
  applyInventoryAdjustments,
  transferInventory,
  getInventorySnapshots,
  listWarehouses
} from './inventory.repository';
import type { InventorySnapshot } from './inventory.types';
import type { Request } from 'express';
import { emitIntegrationEvent } from '../integrations/integration.service';
import { recordAuditEvent } from '../audit/audit.service';

interface ListInventoryInput {
  warehouseId?: string;
  productId?: string;
  distributorId?: string;
  limit?: number;
  offset?: number;
}

interface AdjustmentInput {
  warehouseId: string;
  adjustments: Array<{ productId: string; delta: number; reason: string }>;
  distributorId?: string;
}

interface TransferInput {
  fromWarehouseId: string;
  toWarehouseId: string;
  items: Array<{ productId: string; quantity: number; reason: string }>;
  distributorId?: string;
}

const resolveDistributorScope = (
  user: Request['user'] | undefined,
  requested?: string
): string => {
  if (!user) {
    throw new HttpError(401, 'Authentication required');
  }
  if (user.role === 'admin') {
    if (!requested) throw new HttpError(400, 'distributorId is required');
    return requested;
  }
  const scoped = user.distributorId;
  if (!scoped) throw new HttpError(403, 'No distributor scope assigned');
  if (requested && requested !== scoped) {
    throw new HttpError(403, 'Access to requested distributor denied');
  }
  return scoped;
};

export const listInventory = async (
  input: ListInventoryInput,
  user: Request['user'] | undefined
): Promise<InventorySnapshot[]> => {
  const distributorId = resolveDistributorScope(user, input.distributorId);
  return await getInventorySnapshots({
    warehouseId: input.warehouseId,
    productId: input.productId,
    distributorId,
    limit: input.limit,
    offset: input.offset
  });
};

export const listWarehousesForScope = async (
  distributorId: string | undefined,
  user: Request['user'] | undefined
) => {
  const scopedId = resolveDistributorScope(user, distributorId);
  return await listWarehouses(scopedId);
};

export const adjustInventory = async (
  input: AdjustmentInput,
  user: Request['user'] | undefined
): Promise<void> => {
  const distributorId = resolveDistributorScope(user, input.distributorId);
  if (input.adjustments.length === 0) {
    throw new HttpError(400, 'At least one adjustment is required');
  }
  await applyInventoryAdjustments({
    warehouseId: input.warehouseId,
    adjustments: input.adjustments
  });
  await emitIntegrationEvent('stock.updated', {
    distributorId,
    warehouseId: input.warehouseId,
    adjustments: input.adjustments
  });
  await recordAuditEvent({
    action: 'inventory.adjusted',
    resource: 'inventory',
    userId: user?.id ?? null,
    metadata: { distributorId, warehouseId: input.warehouseId, deltaCount: input.adjustments.length }
  });
};

export const transferStock = async (
  input: TransferInput,
  user: Request['user'] | undefined
): Promise<void> => {
  const distributorId = resolveDistributorScope(user, input.distributorId);
  if (input.items.length === 0) throw new HttpError(400, 'At least one item is required');
  await transferInventory({
    fromWarehouseId: input.fromWarehouseId,
    toWarehouseId: input.toWarehouseId,
    items: input.items
  });
  await recordAuditEvent({
    action: 'inventory.transfer',
    resource: 'inventory',
    userId: user?.id ?? null,
    metadata: {
      distributorId,
      fromWarehouseId: input.fromWarehouseId,
      toWarehouseId: input.toWarehouseId,
      itemCount: input.items.length
    }
  });
};

export const recordDamage = async (
  input: { warehouseId: string; items: Array<{ productId: string; quantity: number; reason: string }>; distributorId?: string },
  user: Request['user'] | undefined
): Promise<void> => {
  const distributorId = resolveDistributorScope(user, input.distributorId);
  const adjustments = input.items.map((i) => ({
    productId: i.productId,
    delta: -Math.abs(i.quantity),
    reason: `damage: ${i.reason}`
  }));
  await applyInventoryAdjustments({
    warehouseId: input.warehouseId,
    adjustments
  });
  await recordAuditEvent({
    action: 'inventory.damage',
    resource: 'inventory',
    userId: user?.id ?? null,
    metadata: {
      distributorId,
      warehouseId: input.warehouseId,
      itemCount: adjustments.length
    }
  });
};
