import { z } from 'zod';

export const listSchemesSchema = {
  query: z.object({
    status: z.enum(['active', 'expired', 'upcoming']).optional(),
    limit: z.coerce.number().min(1).max(100).default(20),
    offset: z.coerce.number().min(0).default(0)
  })
};

export const createSchemeSchema = {
  body: z.object({
    name: z.string().min(3).max(120),
    type: z.enum(['volume', 'combo', 'period', 'price']),
    startDate: z.string().datetime(),
    endDate: z.string().datetime(),
    geoScope: z.string().optional(),
    budget: z.number().nonnegative().optional(),
    formula: z.record(z.any())
  })
};

export const createClaimSchema = {
  body: z.object({
    schemeId: z.string().uuid(),
    distributorId: z.string().uuid().optional(),
    claimedAmount: z.number().nonnegative(),
    notes: z.string().max(250).optional()
  })
};

export const evaluateEligibilitySchema = {
  params: z.object({
    schemeId: z.string().uuid()
  }),
  body: z.object({
    distributorId: z.string().uuid().optional(),
    metrics: z
      .object({
        quantity: z.number().nonnegative(),
        amount: z.number().nonnegative()
      })
      .partial()
  })
};
