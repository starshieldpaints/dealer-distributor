import { readFileSync } from 'fs';
import path from 'path';
import type { Knex } from 'knex';

const loadSql = (file: string): string =>
  readFileSync(path.resolve(__dirname, '..', '..', 'migrations', file), 'utf-8');

const upSql = loadSql('0003_sds_alignment.up.sql');
const downSql = loadSql('0003_sds_alignment.down.sql');

export async function up(knex: Knex): Promise<void> {
  await knex.raw(upSql);
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw(downSql);
}
