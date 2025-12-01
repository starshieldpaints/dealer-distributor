// import { type NextFunction, type Request, type Response } from 'express';
// import { logger } from '../logger';
// import { HttpError } from '../lib/httpError';


// export const notFoundHandler = (_req: Request, res: Response) => {
//   res.status(404).json({ message: 'Resource not found' });
// };

// export const errorHandler = (
//   err: Error,
//   _req: Request,
//   res: Response,
//   _next: NextFunction
// ) => {
//   if (err instanceof HttpError) {
//     if (err.statusCode >= 500) {
//       logger.error({ err }, 'HttpError');
//     }
//     return res.status(err.statusCode).json({
//       message: err.message,
//       details: err.details ?? undefined
//     });
//   }

//   logger.error({ err }, 'Unhandled error');
//   return res.status(500).json({
//     message: 'Unexpected error occurred'
//   });
// };


import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { HttpError } from '../lib/httpError';
import { logger } from '../logger';

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Log the error
  logger.error(err);

  // Handle Zod Validation Errors
  if (err instanceof ZodError) {
    res.status(400).json({
      status: 'error',
      message: 'Validation failed',
      errors: err.errors,
    });
    return;
  }

  // Handle Custom HTTP Errors
  if (err instanceof HttpError) {
    res.status(err.statusCode).json({
      status: 'error',
      message: err.message,
    });
    return;
  }

  // Handle JSON Syntax Errors (common in Express)
  if (err instanceof SyntaxError && 'status' in err && err.status === 400 && 'body' in err) {
    res.status(400).json({
      status: 'error',
      message: 'Invalid JSON payload',
    });
    return;
  }

  // Default Server Error
  res.status(500).json({
    status: 'error',
    message: 'Internal Server Error',
  });
};