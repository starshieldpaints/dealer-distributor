import { Router } from 'express';
import { validateRequest } from '../../middleware/validateRequest';
import { asyncHandler } from '../../utils/asyncHandler';
import { performanceSchema } from './analytics.schemas';
import { getDistributorPerformance } from './analytics.service';

export const analyticsRouter = Router();

analyticsRouter.get(
  '/distributors/:distributorId/performance',
  validateRequest(performanceSchema),
  asyncHandler(async (req, res) => {
    const { distributorId } = req.params;
    const { startDate, endDate } = req.query as Record<string, string>;
    const summary = await getDistributorPerformance({
      distributorId,
      startDate,
      endDate
    });
    res.json({ data: summary });
  })
);
