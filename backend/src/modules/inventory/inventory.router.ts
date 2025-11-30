import { Router } from 'express';
import { validateRequest } from '../../middleware/validateRequest';
import { asyncHandler } from '../../utils/asyncHandler';
import {
  listInventorySchema,
  adjustInventorySchema,
  transferInventorySchema,
  damageInventorySchema,
  listWarehousesSchema
} from './inventory.schemas';
import {
  adjustInventory,
  listInventory,
  listWarehousesForScope,
  recordDamage,
  transferStock
} from './inventory.service';
import { requirePermission } from '../../middleware/permissions';

export const inventoryRouter = Router();

inventoryRouter.get(
  '/snapshots',
  requirePermission('inventory:read'),
  validateRequest(listInventorySchema),
  asyncHandler(async (req, res) => {
    const { warehouseId, productId, limit, offset, distributorId } = req.query as Record<
      string,
      string
    >;
    const snapshots = await listInventory(
      {
        warehouseId,
        productId,
        distributorId,
        limit: Number(limit),
        offset: Number(offset)
      },
      req.user
    );
    res.json({ data: snapshots });
  })
);

inventoryRouter.post(
  '/adjustments',
  requirePermission('inventory:write'),
  validateRequest(adjustInventorySchema),
  asyncHandler(async (req, res) => {
    await adjustInventory(req.body, req.user);
    res.status(202).json({ message: 'Inventory adjustments queued' });
  })
);

inventoryRouter.post(
  '/transfers',
  requirePermission('inventory:write'),
  validateRequest(transferInventorySchema),
  asyncHandler(async (req, res) => {
    await transferStock(req.body, req.user);
    res.status(202).json({ message: 'Transfer recorded' });
  })
);

inventoryRouter.post(
  '/damage',
  requirePermission('inventory:write'),
  validateRequest(damageInventorySchema),
  asyncHandler(async (req, res) => {
    await recordDamage(req.body, req.user);
    res.status(202).json({ message: 'Damage recorded' });
  })
);

inventoryRouter.get(
  '/warehouses',
  requirePermission('inventory:read'),
  validateRequest(listWarehousesSchema),
  asyncHandler(async (req, res) => {
    const { distributorId } = req.query as Record<string, string>;
    const data = await listWarehousesForScope(distributorId, req.user);
    res.json({ data });
  })
);
