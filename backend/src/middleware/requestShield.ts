import type { RequestHandler } from 'express';
import { HttpError } from '../lib/httpError';

const maliciousPattern =
  /(<script|select\s+.+\s+from|drop\s+table|insert\s+into|--|;--|\/\*|\*\/|union\s+all)/i;

const containsMaliciousPayload = (value: unknown): boolean => {
  if (typeof value === 'string') {
    return maliciousPattern.test(value);
  }
  if (Array.isArray(value)) {
    return value.some((item) => containsMaliciousPayload(item));
  }
  if (value && typeof value === 'object') {
    return Object.values(value).some((v) => containsMaliciousPayload(v));
  }
  return false;
};

export const requestShield: RequestHandler = (req, _res, next) => {
  const payloads = [req.path, req.originalUrl, req.query, req.body];
  if (payloads.some((payload) => containsMaliciousPayload(payload))) {
    return next(
      new HttpError(
        400,
        'Request blocked by application firewall due to suspicious payload'
      )
    );
  }
  return next();
};
