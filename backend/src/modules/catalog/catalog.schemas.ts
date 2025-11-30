import { z } from 'zod';

export const listProductsSchema = {
  query: z.object({
    search: z
      .string()
      .trim()
      .optional()
      .transform((val) => (val && val.length > 0 ? val : undefined)),
    categoryId: z
      .union([z.string().uuid(), z.literal('')])
      .optional()
      .transform((val) => (val ? val : undefined)),
    priceListId: z
      .union([z.string().uuid(), z.literal('')])
      .optional()
      .transform((val) => (val ? val : undefined)),
    minPrice: z.coerce.number().optional(),
    maxPrice: z.coerce.number().optional(),
    sortBy: z.enum(['name', 'price', 'updatedAt']).optional(),
    sortDir: z.enum(['asc', 'desc']).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
    offset: z.coerce.number().int().min(0).optional()
  })
};

export const createProductSchema = {
  body: z.object({
    sku: z.string().min(2),
    name: z.string().min(2),
    uom: z.string().min(1),
    categoryId: z.string().uuid().optional(),
    priceListId: z.string().uuid().optional(),
    price: z.number().nonnegative().optional(),
    basePrice: z.number().nonnegative().optional(),
    taxGroup: z.string().optional()
  })
};

export const updateProductSchema = {
  body: z.object({
    name: z.string().min(2).optional(),
    uom: z.string().min(1).optional(),
    categoryId: z.string().uuid().optional().nullable(),
    hsnCode: z.string().optional().nullable(),
    packSize: z.string().optional().nullable(),
    ratio: z.string().optional().nullable(),
    basePrice: z.number().nonnegative().optional().nullable(),
    taxGroup: z.string().optional().nullable(),
    status: z.enum(['active', 'inactive']).optional()
  }),
  params: z.object({
    id: z.string().uuid()
  })
};

export const updatePriceItemSchema = {
  body: z.object({
    priceListId: z.string().uuid(),
    price: z.number().nonnegative().optional(),
    discountPercent: z.number().optional().nullable(),
    priceWithoutTax: z.number().optional().nullable(),
    priceWithTax: z.number().optional().nullable(),
    promo: z.number().optional().nullable(),
    mrp: z.number().optional().nullable()
  }),
  params: z.object({
    productId: z.string().uuid()
  })
};

export const listPriceListSchema = {
  query: z.object({
    limit: z.coerce.number().int().min(1).max(100).optional(),
    offset: z.coerce.number().int().min(0).optional()
  })
};

export const listImportHistorySchema = {
  query: z.object({
    limit: z.coerce.number().int().min(1).max(100).optional()
  })
};

export const priceHistorySchema = {
  params: z.object({
    id: z.string().uuid()
  }),
  query: z.object({
    limit: z.coerce.number().int().min(1).max(100).optional()
  })
};

export const listWarehousesSchema = {
  query: z.object({
    distributorId: z.string().uuid().optional()
  })
};
