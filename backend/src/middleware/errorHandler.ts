import { type NextFunction, type Request, type Response } from 'express';
import { logger } from '../logger';
import { HttpError } from '../lib/httpError';

export const notFoundHandler = (_req: Request, res: Response) => {
  res.status(404).json({ message: 'Resource not found' });
};

export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  if (err instanceof HttpError) {
    if (err.statusCode >= 500) {
      logger.error({ err }, 'HttpError');
    }
    return res.status(err.statusCode).json({
      message: err.message,
      details: err.details ?? undefined
    });
  }

  logger.error({ err }, 'Unhandled error');
  return res.status(500).json({
    message: 'Unexpected error occurred'
  });
};
