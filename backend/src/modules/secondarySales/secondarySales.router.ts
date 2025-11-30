import { Router } from 'express';
import { validateRequest } from '../../middleware/validateRequest';
import { asyncHandler } from '../../utils/asyncHandler';
import {
  listSecondarySalesSchema,
  createSecondarySaleSchema
} from './secondarySales.schemas';
import {
  getSecondarySales,
  recordSecondarySale
} from './secondarySales.service';

export const secondarySalesRouter = Router();

secondarySalesRouter.get(
  '/',
  validateRequest(listSecondarySalesSchema),
  asyncHandler(async (req, res) => {
    const { distributorId, limit, offset } = req.query as Record<string, string>;
    const data = await getSecondarySales(
      {
        distributorId,
        limit: Number(limit),
        offset: Number(offset)
      },
      req.user
    );
    res.json({ data });
  })
);

secondarySalesRouter.post(
  '/',
  validateRequest(createSecondarySaleSchema),
  asyncHandler(async (req, res) => {
    const sale = await recordSecondarySale(req.body, req.user);
    res.status(201).json({ data: sale });
  })
);
