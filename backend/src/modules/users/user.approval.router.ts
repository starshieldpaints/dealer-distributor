import { Router } from 'express';
import { authorize } from '../../middleware/authorize';
import { asyncHandler } from '../../utils/asyncHandler';
import { listPendingUsers, updateApprovalStatus } from './user.repository';
import { HttpError } from '../../lib/httpError';

export const approvalRouter = Router();

approvalRouter.use(authorize('admin'));

approvalRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    const users = await listPendingUsers();
    res.json({ data: users });
  })
);

approvalRouter.post(
  '/:userId/approve',
  asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const notes = req.body?.notes;
    if (!userId) throw new HttpError(400, 'userId is required');
    await updateApprovalStatus({
      userId,
      status: 'approved',
      notes,
      approvedBy: req.user!.id
    });
    res.status(204).send();
  })
);

approvalRouter.post(
  '/:userId/reject',
  asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const notes = req.body?.notes;
    if (!userId) throw new HttpError(400, 'userId is required');
    await updateApprovalStatus({
      userId,
      status: 'rejected',
      notes,
      approvedBy: req.user!.id
    });
    res.status(204).send();
  })
);
