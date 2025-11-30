import { type RequestHandler } from 'express';

export const asyncHandler = (fn: RequestHandler): RequestHandler => {
  return async (req, res, next) => {
    try {
      await Promise.resolve(fn(req, res, next));
    } catch (error) {
      next(error);
    }
  };
};
