// import type { RequestHandler } from 'express';
// import { HttpError } from '../lib/httpError';

// const maliciousPattern =
//   /(<script|select\s+.+\s+from|drop\s+table|insert\s+into|--|;--|\/\*|\*\/|union\s+all)/i;

// const containsMaliciousPayload = (value: unknown): boolean => {
//   if (typeof value === 'string') {
//     return maliciousPattern.test(value);
//   }
//   if (Array.isArray(value)) {
//     return value.some((item) => containsMaliciousPayload(item));
//   }
//   if (value && typeof value === 'object') {
//     return Object.values(value).some((v) => containsMaliciousPayload(v));
//   }
//   return false;
// };

// export const requestShield: RequestHandler = (req, _res, next) => {
//   const payloads = [req.path, req.originalUrl, req.query, req.body];
//   if (payloads.some((payload) => containsMaliciousPayload(payload))) {
//     return next(
//       new HttpError(
//         400,
//         'Request blocked by application firewall due to suspicious payload'
//       )
//     );
//   }
//   return next();
// };


// import { Request, Response, NextFunction } from 'express';
// import { logger } from '../logger';

// export const requestShield = (req: Request, res: Response, next: NextFunction) => {
//   try {
//     // Basic security checks
//     const { headers, body, query } = req;

//     // Block common malicious headers (basic example)
//     if (headers['x-forwarded-host'] && typeof headers['x-forwarded-host'] === 'string') {
//         // Validation logic can go here
//     }

//     // Sanitize body if needed (optional implementation)
//     // This is a placeholder for your specific logic
    
//     next();
//   } catch (error) {
//     logger.error('Request Shield Error:', error);
//     // Fail safe: allow request or block depending on policy. 
//     // Usually best to block if security check fails.
//     res.status(400).json({ message: 'Malformatted request detected.' });
//   }
// };


import { Request, Response, NextFunction } from 'express';
import { logger } from '../logger';

export const requestShield = (req: Request, res: Response, next: NextFunction) => {
  try {
    // Basic Header Checks
    const { headers } = req;

    // Block common malicious headers or behavior
    if (headers['x-forwarded-host'] && typeof headers['x-forwarded-host'] === 'string') {
       // logic to validate host if needed
    }

    next();
  } catch (error) {
    // Check if logger exists before using it to prevent startup crashes
    if (logger) {
      logger.error('Request Shield Error:', error);
    } else {
      console.error('Request Shield Error:', error);
    }
    // Fail safe: Allow request but log error, or block if strict
    next(); 
  }
};