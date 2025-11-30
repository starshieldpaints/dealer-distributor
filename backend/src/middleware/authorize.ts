import { type RequestHandler } from 'express';
import { HttpError } from '../lib/httpError';

export const authorize =
  (...roles: string[]): RequestHandler =>
  (req, _res, next) => {
    if (!req.user) {
      return next(new HttpError(401, 'Authentication required'));
    }
    if (!roles.includes(req.user.role)) {
      return next(new HttpError(403, 'Insufficient permissions'));
    }
    return next();
  };
