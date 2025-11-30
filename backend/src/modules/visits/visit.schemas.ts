import { z } from 'zod';

export const listVisitsSchema = {
  query: z.object({
    limit: z.coerce.number().min(1).max(200).default(50),
    offset: z.coerce.number().min(0).default(0)
  })
};

export const createVisitSchema = {
  body: z.object({
    retailerId: z.string().uuid().optional(),
    notes: z.string().max(250).optional()
  })
};

export const completeVisitSchema = {
  params: z.object({
    id: z.string().uuid()
  }),
  body: z.object({
    notes: z.string().max(250).optional()
  })
};
