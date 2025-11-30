import { z } from 'zod';

export const performanceSchema = {
  params: z.object({
    distributorId: z.string().uuid()
  }),
  query: z.object({
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional()
  })
};
