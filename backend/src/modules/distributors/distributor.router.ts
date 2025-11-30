import { Router } from 'express';
import { authorize } from '../../middleware/authorize';
import { validateRequest } from '../../middleware/validateRequest';
import { asyncHandler } from '../../utils/asyncHandler';
import {
  createDistributorRecord,
  createDistributorRetailer,
  getDistributorsForUser,
  getDistributorProfile,
  listDistributorRetailers
} from './distributor.service';
import {
  createDistributorSchema,
  createRetailerSchema,
  distributorIdParam,
  listDistributorsSchema,
  listRetailersSchema
} from './distributor.schemas';
import { requirePermission } from '../../middleware/permissions';

export const distributorRouter = Router();

distributorRouter.get(
  '/',
  requirePermission('distributors:read'),
  validateRequest(listDistributorsSchema),
  asyncHandler(async (req, res) => {
    const { parentId, territoryId, search, limit, offset } = req.query as Record<
      string,
      string
    >;
    const distributors = await getDistributorsForUser(req.user, {
      parentId,
      territoryId,
      search,
      limit: limit ? Number(limit) : undefined,
      offset: offset ? Number(offset) : undefined
    });
    res.json({ data: distributors });
  })
);

distributorRouter.post(
  '/',
  authorize('admin'),
  requirePermission('distributors:write'),
  validateRequest(createDistributorSchema),
  asyncHandler(async (req, res) => {
    const distributor = await createDistributorRecord(req.body, req.user);
    res.status(201).json({ data: distributor });
  })
);

distributorRouter.get(
  '/:id',
  requirePermission('distributors:read'),
  validateRequest(distributorIdParam),
  asyncHandler(async (req, res) => {
    const distributor = await getDistributorProfile(req.params.id, req.user);
    res.json({ data: distributor });
  })
);

distributorRouter.get(
  '/retailers',
  requirePermission('retailers:read'),
  validateRequest(listRetailersSchema),
  asyncHandler(async (req, res) => {
    const { distributorId, search, status, limit, offset } = req.query as Record<
      string,
      string
    >;
    const retailers = await listDistributorRetailers(
      distributorId,
      {
        search,
        status,
        limit: limit ? Number(limit) : undefined,
        offset: offset ? Number(offset) : undefined
      },
      req.user
    );
    res.json({ data: retailers });
  })
);

distributorRouter.post(
  '/retailers',
  requirePermission('retailers:write'),
  validateRequest(createRetailerSchema),
  asyncHandler(async (req, res) => {
    const retailer = await createDistributorRetailer(req.body, req.user);
    res.status(201).json({ data: retailer });
  })
);
