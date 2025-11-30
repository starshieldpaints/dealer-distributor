import { HttpError } from '../../lib/httpError';
import type { Request } from 'express';
import { getNotificationLogs } from './notificationLog.repository';

export const listNotifications = async (
  user: Request['user'] | undefined,
  input: { distributorId?: string; limit?: number; offset?: number }
) => {
  if (!user) throw new HttpError(401, 'Authentication required');

  if (user.role === 'admin') {
    const distributorId = input.distributorId ?? null;
    if (!distributorId) {
      throw new HttpError(400, 'distributorId is required for admin view');
    }
    return await getNotificationLogs(distributorId, input.limit, input.offset);
  }

  const distributorId = user.distributorId;
  if (!distributorId) throw new HttpError(403, 'No distributor scope assigned');
  return await getNotificationLogs(distributorId, input.limit, input.offset);
};
