import { Router } from 'express';
import { validateRequest } from '../../middleware/validateRequest';
import { asyncHandler } from '../../utils/asyncHandler';
import {
  createHoldSchema,
  getLedgerSchema,
  recordPaymentSchema,
  editCreditLimitSchema,
  getHoldsSchema,
  getAgingSchema
} from './credit.schemas';
import {
  getAging,
  getCreditSummary,
  getLedger,
  listCreditHolds,
  logPayment,
  placeCreditHold,
  updateLimit
} from './credit.service';
import { requirePermission } from '../../middleware/permissions';

export const creditRouter = Router();

creditRouter.get(
  '/:distributorId/ledger',
  requirePermission('credit:read'),
  validateRequest(getLedgerSchema),
  asyncHandler(async (req, res) => {
    const { distributorId } = req.params;
    const { limit, offset } = req.query as Record<string, string>;
    const entries = await getLedger(
      {
        distributorId,
        limit: Number(limit),
        offset: Number(offset)
      },
      req.user
    );
    res.json({ data: entries });
  })
);

creditRouter.get(
  '/:distributorId/summary',
  requirePermission('credit:read'),
  asyncHandler(async (req, res) => {
    const summary = await getCreditSummary(req.params.distributorId, req.user);
    res.json({ data: summary });
  })
);

creditRouter.post(
  '/holds',
  requirePermission('credit:write'),
  validateRequest(createHoldSchema),
  asyncHandler(async (req, res) => {
    await placeCreditHold(req.body, req.user);
    res.status(201).json({ message: 'Credit hold recorded' });
  })
);

creditRouter.get(
  '/:distributorId/holds',
  requirePermission('credit:read'),
  validateRequest(getHoldsSchema),
  asyncHandler(async (req, res) => {
    const holds = await listCreditHolds(req.params.distributorId, req.user);
    res.json({ data: holds });
  })
);

creditRouter.post(
  '/payments',
  requirePermission('credit:write'),
  validateRequest(recordPaymentSchema),
  asyncHandler(async (req, res) => {
    await logPayment(req.body, req.user);
    res.status(201).json({ message: 'Payment logged' });
  })
);

creditRouter.patch(
  '/:distributorId/limit',
  requirePermission('credit:write'),
  validateRequest(editCreditLimitSchema),
  asyncHandler(async (req, res) => {
    await updateLimit(req.params.distributorId, req.body.creditLimit, req.user);
    res.status(204).send();
  })
);

creditRouter.get(
  '/:distributorId/aging',
  requirePermission('credit:read'),
  validateRequest(getAgingSchema),
  asyncHandler(async (req, res) => {
    const data = await getAging(req.params.distributorId, req.user);
    res.json({ data });
  })
);
