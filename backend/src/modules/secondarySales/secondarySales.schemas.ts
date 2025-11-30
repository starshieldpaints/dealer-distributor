import { z } from 'zod';

export const listSecondarySalesSchema = {
  query: z.object({
    distributorId: z.string().uuid().optional(),
    limit: z.coerce.number().min(1).max(200).default(50),
    offset: z.coerce.number().min(0).default(0)
  })
};

export const createSecondarySaleSchema = {
  body: z.object({
    distributorId: z.string().uuid().optional(),
    retailerId: z.string().uuid(),
    productId: z.string().uuid(),
    quantity: z.number().positive(),
    amount: z.number().nonnegative(),
    saleDate: z.string().date()
  })
};
