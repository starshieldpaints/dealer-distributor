import { Router } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { searchPincodes } from './pincode.repository';

export const pincodeRouter = Router();

pincodeRouter.get(
  '/search',
  asyncHandler(async (req, res) => {
    const query = (req.query.q as string) ?? '';
    if (query.trim().length < 3) {
      return res.json({ data: [] });
    }
    const limit = Math.min(Number(req.query.limit ?? 20), 50);
    const results = await searchPincodes(query.trim(), limit);
    res.json({ data: results });
  })
);
