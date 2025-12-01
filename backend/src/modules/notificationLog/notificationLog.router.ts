// import { Router } from 'express';
// import { validateRequest } from '../../middleware/validateRequest';
// import { asyncHandler } from '../../utils/asyncHandler';
// import { listNotificationsSchema } from './notificationLog.schemas';
// import { listNotifications } from './notificationLog.service';

// export const notificationRouter = Router();

// notificationRouter.get(
//   '/',
//   validateRequest(listNotificationsSchema),
//   asyncHandler(async (req, res) => {
//     const { distributorId, limit, offset } = req.query as Record<string, string>;
//     const data = await listNotifications(req.user, {
//       distributorId,
//       limit: Number(limit),
//       offset: Number(offset)
//     });
//     res.json({ data });
//   })
// );


import { Router } from 'express';
import { env } from '../../config/env';

// Placeholder or Actual Implementation
export const notificationLogRouter = Router();

notificationLogRouter.get('/', (req, res) => {
  res.json({ data: [] });
});

notificationLogRouter.post('/read-all', (req, res) => {
  res.json({ success: true });
});