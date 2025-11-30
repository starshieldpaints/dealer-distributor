import { Router } from 'express';
import { validateRequest } from '../../middleware/validateRequest';
import { asyncHandler } from '../../utils/asyncHandler';
import {
  createSchemeSchema,
  createClaimSchema,
  listSchemesSchema,
  evaluateEligibilitySchema
} from './scheme.schemas';
import {
  createScheme,
  getSchemes,
  submitSchemeClaim,
  evaluateSchemeEligibility
} from './scheme.service';

export const schemesRouter = Router();

schemesRouter.get(
  '/',
  validateRequest(listSchemesSchema),
  asyncHandler(async (req, res) => {
    const { status, limit, offset } = req.query as Record<string, string>;
    const schemes = await getSchemes({
      status: status as any,
      limit: Number(limit),
      offset: Number(offset)
    });
    res.json({ data: schemes });
  })
);

schemesRouter.post(
  '/',
  validateRequest(createSchemeSchema),
  asyncHandler(async (req, res) => {
    const scheme = await createScheme(req.body);
    res.status(201).json({ data: scheme });
  })
);

schemesRouter.post(
  '/claims',
  validateRequest(createClaimSchema),
  asyncHandler(async (req, res) => {
    const claim = await submitSchemeClaim(req.body, req.user);
    res.status(201).json({ data: claim });
  })
);

schemesRouter.post(
  '/:schemeId/eligibility',
  validateRequest(evaluateEligibilitySchema),
  asyncHandler(async (req, res) => {
    const evaluation = await evaluateSchemeEligibility(req.params.schemeId, req.body.metrics ?? {});
    res.json({ data: evaluation });
  })
);
