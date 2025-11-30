import { z } from 'zod';

export const orderStatusSchema = z.enum([
  'draft',
  'submitted',
  'approved',
  'rejected',
  'dispatched',
  'delivered',
  'returned',
  'cancelled'
]);

export const listOrdersSchema = {
  query: z.object({
    distributorId: z.string().uuid().optional(),
    status: orderStatusSchema.optional(),
    limit: z.coerce.number().min(1).max(100).default(20),
    offset: z.coerce.number().min(0).default(0)
  })
};

export const createOrderSchema = {
  body: z.object({
    distributorId: z.string().uuid().optional(),
    retailerId: z.string().uuid().optional(),
    salesRepId: z.string().uuid().optional(),
    currency: z.string().length(3).default('USD'),
    items: z
      .array(
        z.object({
          productId: z.string().uuid(),
          quantity: z.number().positive(),
          unitPrice: z.number().nonnegative(),
          schemeId: z.string().uuid().optional(),
          discountAmount: z.number().nonnegative().optional()
        })
      )
      .min(1),
    notes: z.string().max(500).optional()
  })
};

export const updateOrderStatusSchema = {
  params: z.object({
    id: z.string().uuid()
  }),
  body: z.object({
    status: orderStatusSchema,
    comment: z.string().max(300).optional()
  })
};
