// import { createServer } from 'http';
// import { createApp } from './app';
// import { config } from './config';
// import { logger } from './logger';
// import { pool } from './db/pool';
// import { closeRedis } from './lib/redis';
// import { env } from './config/env';
// import { app } from './app';
// import { pool } from './db/pool';
// import { redisClient } from './lib/redis';
// import { logger } from './logger';

// const app = createApp();
// const server = createServer(app);

// server.listen(config.port, () => {
//   logger.info({ port: config.port }, 'API server started');
// });

// const shutdown = async (signal: string) => {
//   logger.info({ signal }, 'Shutting down');
//   server.close(() => {
//     logger.info('HTTP server closed');
//   });
//   await pool.end();
//   await closeRedis();
//   process.exit(0);
// };

// process.on('SIGTERM', () => {
//   void shutdown('SIGTERM');
// });

// process.on('SIGINT', () => {
//   void shutdown('SIGINT');
// });
// Import env before anything else to ensure variables are loaded
import { env } from './config/env';
import { app } from './app';
import { pool } from './db/pool';
import { redisClient } from './lib/redis';
import { logger } from './logger';

const PORT = env.PORT || 3000;

const startServer = async () => {
  try {
    // 1. Check Database Connection
    await pool.query('SELECT 1');
    logger.info('📦 Database connected successfully');

    // 2. Check Redis Connection (if enabled)
    if (redisClient) {
      // Redis connects automatically, but we can log that it's initialized
      logger.info('🔴 Redis client initialized');
    }

    // 3. Start Server
    app.listen(PORT, () => {
      logger.info(`🚀 Server running in ${env.NODE_ENV} mode on port ${PORT}`);
      logger.info(`👉 http://localhost:${PORT}`);
    });

  } catch (error) {
    logger.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

startServer();