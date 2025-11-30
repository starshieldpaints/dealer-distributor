import { createServer } from 'http';
import { createApp } from './app';
import { config } from './config';
import { logger } from './logger';
import { pool } from './db/pool';
import { closeRedis } from './lib/redis';

const app = createApp();
const server = createServer(app);

server.listen(config.port, () => {
  logger.info({ port: config.port }, 'API server started');
});

const shutdown = async (signal: string) => {
  logger.info({ signal }, 'Shutting down');
  server.close(() => {
    logger.info('HTTP server closed');
  });
  await pool.end();
  await closeRedis();
  process.exit(0);
};

process.on('SIGTERM', () => {
  void shutdown('SIGTERM');
});

process.on('SIGINT', () => {
  void shutdown('SIGINT');
});
