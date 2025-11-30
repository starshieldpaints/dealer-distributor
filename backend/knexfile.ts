import type { Knex } from 'knex';
import { loadEnv } from './src/config/env';

const env = loadEnv();

const seedDirectoryFor = (target: 'development' | 'test' | 'production'): string => {
  switch (target) {
    case 'production':
      return './knex/seeds/production';
    case 'test':
      return './knex/seeds/test';
    default:
      return './knex/seeds/dev';
  }
};

const createConfig = (
  target: 'development' | 'test' | 'production',
  databaseUrl: string
): Knex.Config => ({
  client: 'pg',
  connection: databaseUrl,
  pool: {
    min: 2,
    max: 10
  },
  migrations: {
    directory: './knex/migrations',
    tableName: '_app_migrations',
    loadExtensions: ['.ts'],
    extension: 'ts',
    sortDirsSeparately: false
  },
  seeds: {
    directory: seedDirectoryFor(target),
    loadExtensions: ['.ts']
  }
});

const config: Record<string, Knex.Config> = {
  development: createConfig('development', env.postgresUrl),
  test: createConfig('test', env.postgresTestUrl ?? env.postgresUrl),
  production: createConfig('production', env.postgresUrl)
};

export default config;
module.exports = config;
