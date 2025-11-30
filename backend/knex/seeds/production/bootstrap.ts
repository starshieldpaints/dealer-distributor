import type { Knex } from 'knex';
import { hashPassword } from '../../../src/lib/password';

const DEFAULT_ADMIN_EMAIL = process.env.DEFAULT_ADMIN_EMAIL ?? 'admin@company.com';
const DEFAULT_ADMIN_PASSWORD = process.env.DEFAULT_ADMIN_PASSWORD ?? 'ChangeMe123!';

export async function seed(knex: Knex): Promise<void> {
  const passwordHash = await hashPassword(DEFAULT_ADMIN_PASSWORD);

  await knex('users')
    .insert({
      name: 'Platform Admin',
      email: DEFAULT_ADMIN_EMAIL,
      password_hash: passwordHash,
      role: 'admin',
      status: 'active'
    })
    .onConflict('email')
    .ignore();
}
