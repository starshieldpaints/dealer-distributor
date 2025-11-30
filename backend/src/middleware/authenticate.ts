import { type RequestHandler } from 'express';
import { HttpError } from '../lib/httpError';
import { verifyAccessToken } from '../lib/jwt';
import { findUserById } from '../modules/users/user.repository';
import { getPermissionsForRole } from '../lib/permissions';

export const authenticate: RequestHandler = async (req, _res, next) => {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      throw new HttpError(401, 'Authorization token missing');
    }
    const token = header.replace('Bearer ', '').trim();
    const payload = verifyAccessToken(token);
    const user = await findUserById(payload.sub);
    if (!user || user.status !== 'active') {
      throw new HttpError(401, 'Invalid authentication token');
    }
    if (user.approvalStatus !== 'approved') {
      throw new HttpError(403, 'Account is awaiting approval');
    }
    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      distributorId: user.distributorId ?? null,
      geoRole: user.geoRole ?? null,
      permissions: getPermissionsForRole(user.role)
    };
    next();
  } catch (error) {
    if (error instanceof HttpError) {
      next(error);
    } else {
      next(new HttpError(401, 'Invalid authentication token'));
    }
  }
};
