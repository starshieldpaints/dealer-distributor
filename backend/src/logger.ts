// import pino from 'pino';
// import { config } from './config';

// export const logger = pino({
//   level: config.nodeEnv === 'production' ? 'info' : 'debug',
//   transport: config.nodeEnv === 'production'
//     ? undefined
//     : {
//         target: 'pino-pretty',
//         options: {
//           colorize: true,
//           translateTime: 'SYS:standard'
//         }
//       }
// });

import pino from 'pino';
import pinoHttp from 'pino-http';
import { env } from './config/env';

// 1. Export the main logger instance
export const logger = pino({
  level: env.NODE_ENV === 'production' ? 'info' : 'debug',
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
    },
  },
});

// 2. Export the HTTP request logger middleware
export const requestLogger = pinoHttp({
  logger,
  // Reduce noise in development by not logging successful health checks
  autoLogging: {
    ignore: (req) => req.url === '/health' || req.url === '/api/health',
  },
});