import { Router } from 'express';
import { validateRequest } from '../../middleware/validateRequest';
import { asyncHandler } from '../../utils/asyncHandler';
import { listNotificationsSchema } from './notificationLog.schemas';
import { listNotifications } from './notificationLog.service';

export const notificationRouter = Router();

notificationRouter.get(
  '/',
  validateRequest(listNotificationsSchema),
  asyncHandler(async (req, res) => {
    const { distributorId, limit, offset } = req.query as Record<string, string>;
    const data = await listNotifications(req.user, {
      distributorId,
      limit: Number(limit),
      offset: Number(offset)
    });
    res.json({ data });
  })
);
