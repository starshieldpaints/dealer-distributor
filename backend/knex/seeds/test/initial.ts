import type { Knex } from 'knex';
import { hashPassword } from '../../../src/lib/password';

export async function seed(knex: Knex): Promise<void> {
  await knex.transaction(async (trx) => {
    const [territory] = await trx('territories')
      .insert({
        name: 'Test Territory',
        code: 'TEST',
        region: 'Test'
      })
      .onConflict('code')
      .merge()
      .returning(['id']);
    const territoryId = territory.id as string;

    const [distributor] = await trx('distributors')
      .insert({
        name: 'Test Distributor',
        code: 'TEST-DIST',
        territory_id: territoryId,
        credit_limit: 100000,
        currency: 'USD'
      })
      .onConflict('code')
      .merge()
      .returning(['id']);
    const distributorId = distributor.id as string;

    const password = await hashPassword('Test1234!');
    await trx('users')
      .insert({
        name: 'Test Admin',
        email: 'test.admin@ddms.io',
        password_hash: password,
        role: 'admin',
        status: 'active'
      })
      .onConflict('email')
      .merge({
        password_hash: password,
        updated_at: trx.fn.now()
      });

    await trx('users')
      .insert({
        name: 'Test Distributor User',
        email: 'test.dist@ddms.io',
        password_hash: password,
        role: 'distributor',
        distributor_id: distributorId,
        status: 'active'
      })
      .onConflict('email')
      .merge({
        distributor_id: distributorId,
        updated_at: trx.fn.now()
      });
  });
}
