import knexFactory from 'knex';
import knexConfig from '../knexfile';
import { loadEnv } from '../src/config/env';
import { logger } from '../src/logger';

const env = loadEnv();
const nodeEnv =
  (process.env.NODE_ENV as 'development' | 'test' | 'production' | undefined) ??
  env.nodeEnv;

const config = knexConfig[nodeEnv];

if (!config) {
  throw new Error(`No Knex configuration found for NODE_ENV=${nodeEnv}`);
}

const run = async (): Promise<void> => {
  const knex = knexFactory(config);
  try {
    logger.info({ nodeEnv }, 'Running seed data');
    await knex.seed.run();
    logger.info('Seed data complete');
  } finally {
    await knex.destroy();
  }
};

run().catch((error) => {
  logger.error({ error }, 'Seeding failed');
  process.exitCode = 1;
});
