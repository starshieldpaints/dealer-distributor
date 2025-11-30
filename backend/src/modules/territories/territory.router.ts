import { Router } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { listTerritories } from './territory.repository';

export const territoryRouter = Router();

territoryRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    const territories = await listTerritories();
    res.json({ data: territories });
  })
);
