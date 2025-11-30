import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import type { Application } from 'express';
import hpp from 'hpp';
import { config } from './config';
import { logger } from './logger';
import { registerRoutes } from './routes';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { requestShield } from './middleware/requestShield';
import { apiRateLimiter, authRateLimiter } from './middleware/rateLimit';

export const createApp = (): Application => {
  const app = express();

  app.set('trust proxy', 1);
  app.use(helmet());
  app.use(
    cors({
      origin: config.allowedOrigins.length === 0 ? true : config.allowedOrigins,
      credentials: true
    })
  );
  app.use(hpp());
  app.use(requestShield);
  // Allow modestly larger JSON payloads (e.g., bulk orders/uploads) while still protecting the server
  app.use(express.json({ limit: '8mb' }));
  app.use('/api/v1', apiRateLimiter);
  app.use('/api/v1/auth/login', authRateLimiter);
  app.use('/api/v1/auth/register', authRateLimiter);

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  registerRoutes(app);

  app.use(notFoundHandler);
  app.use(errorHandler);

  app.on('close', () => {
    logger.info('HTTP server closing');
  });

  return app;
};
