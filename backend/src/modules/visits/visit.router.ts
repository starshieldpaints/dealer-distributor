import { Router } from 'express';
import { validateRequest } from '../../middleware/validateRequest';
import { asyncHandler } from '../../utils/asyncHandler';
import {
  createVisitEntry,
  completeVisit,
  getVisitsForRep
} from './visit.service';
import {
  createVisitSchema,
  completeVisitSchema,
  listVisitsSchema
} from './visit.schemas';

export const visitRouter = Router();

visitRouter.get(
  '/',
  validateRequest(listVisitsSchema),
  asyncHandler(async (req, res) => {
    const { limit, offset } = req.query as Record<string, string>;
    const visits = await getVisitsForRep(req.user, {
      limit: Number(limit),
      offset: Number(offset)
    });
    res.json({ data: visits });
  })
);

visitRouter.post(
  '/',
  validateRequest(createVisitSchema),
  asyncHandler(async (req, res) => {
    const visit = await createVisitEntry(req.user, req.body);
    res.status(201).json({ data: visit });
  })
);

visitRouter.post(
  '/:id/complete',
  validateRequest(completeVisitSchema),
  asyncHandler(async (req, res) => {
    const visit = await completeVisit(req.user, {
      visitId: req.params.id,
      notes: req.body.notes
    });
    res.json({ data: visit });
  })
);
