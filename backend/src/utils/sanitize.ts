import { HttpError } from '../lib/httpError';

const forbiddenKeys = new Set(['__proto__', 'prototype', 'constructor']);

const inspectObject = (value: unknown): void => {
  if (!value || typeof value !== 'object') {
    return;
  }
  if (Array.isArray(value)) {
    value.forEach(inspectObject);
    return;
  }
  for (const [key, nestedValue] of Object.entries(value)) {
    if (forbiddenKeys.has(key)) {
      throw new HttpError(400, 'Prototype pollution key detected in payload');
    }
    inspectObject(nestedValue);
  }
};

export const sanitizePayload = (payload: unknown): void => {
  inspectObject(payload);
};
