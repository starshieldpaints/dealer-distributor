import { type RequestHandler } from 'express';
import { type AnyZodObject, ZodError } from 'zod';
import { HttpError } from '../lib/httpError';
import { sanitizePayload } from '../utils/sanitize';

type Schema = {
  body?: AnyZodObject;
  query?: AnyZodObject;
  params?: AnyZodObject;
};

export const validateRequest = (schema: Schema): RequestHandler => {
  return (req, _res, next) => {
    try {
      if (schema.body) {
        sanitizePayload(req.body);
        req.body = schema.body.parse(req.body);
      }
      if (schema.query) {
        sanitizePayload(req.query);
        req.query = schema.query.parse(req.query);
      }
      if (schema.params) {
        sanitizePayload(req.params);
        req.params = schema.params.parse(req.params);
      }
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        return next(new HttpError(422, 'Validation failed', error.flatten()));
      }
      return next(error);
    }
  };
};
