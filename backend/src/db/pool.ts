import { Pool } from 'pg';
import { config } from '../config';
import { logger } from '../logger';

export const pool = new Pool({
  connectionString: config.postgresUrl,
  max: 20,
  idleTimeoutMillis: 30_000
});

pool.on('error', (err) => {
  logger.error({ err }, 'Unexpected Postgres client error');
});
