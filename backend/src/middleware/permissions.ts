import type { RequestHandler } from 'express';
import { HttpError } from '../lib/httpError';
import type { Permission } from '../lib/permissions';
import { roleHasPermission } from '../lib/permissions';

export const requirePermission =
  (...permissions: Permission[]): RequestHandler =>
  (req, _res, next) => {
    if (!req.user) {
      return next(new HttpError(401, 'Authentication required'));
    }
    const allowed = permissions.some((permission) =>
      roleHasPermission(req.user!.role, permission)
    );
    if (!allowed) {
      return next(
        new HttpError(403, 'Insufficient privileges for this operation')
      );
    }
    next();
  };
