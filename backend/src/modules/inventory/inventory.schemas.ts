import { z } from 'zod';

export const listInventorySchema = {
  query: z.object({
    warehouseId: z.string().uuid().optional(),
    productId: z.string().uuid().optional(),
    distributorId: z.string().uuid().optional(),
    limit: z.coerce.number().min(1).max(200).default(50),
    offset: z.coerce.number().min(0).default(0)
  })
};

export const adjustInventorySchema = {
  body: z.object({
    warehouseId: z.string().uuid(),
    distributorId: z.string().uuid().optional(),
    adjustments: z
      .array(
        z.object({
          productId: z.string().uuid(),
          delta: z.number(),
          reason: z.string().max(120)
        })
      )
      .min(1)
  })
};

export const transferInventorySchema = {
  body: z.object({
    fromWarehouseId: z.string().uuid(),
    toWarehouseId: z.string().uuid(),
    distributorId: z.string().uuid().optional(),
    items: z
      .array(
        z.object({
          productId: z.string().uuid(),
          quantity: z.number().positive(),
          reason: z.string().max(120)
        })
      )
      .min(1)
  })
};

export const damageInventorySchema = {
  body: z.object({
    warehouseId: z.string().uuid(),
    distributorId: z.string().uuid().optional(),
    items: z
      .array(
        z.object({
          productId: z.string().uuid(),
          quantity: z.number().positive(),
          reason: z.string().max(120)
        })
      )
      .min(1)
  })
};

export const listWarehousesSchema = {
  query: z.object({
    distributorId: z.string().uuid().optional()
  })
};
