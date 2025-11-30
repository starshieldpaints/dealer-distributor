import { pool } from '../src/db/pool';
import { hashPassword } from '../src/lib/password';

const withTx = async <T>(fn: (client: any) => Promise<T>): Promise<T> => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

const upsert = async (
  client: any,
  query: string,
  params: any[],
  uniqueKey: string
): Promise<string> => {
  const existing = await client.query<{ id: string }>(`SELECT id FROM ${uniqueKey} LIMIT 1`);
  if (existing.rows.length > 0) return existing.rows[0].id;
  const res = await client.query<{ id: string }>(query, params);
  return res.rows[0].id;
};

async function seed(): Promise<void> {
  const password = await hashPassword('Password@123');
  await withTx(async (client) => {
    const dist = await client.query<{ id: string }>(
      `INSERT INTO distributors (name, code, credit_limit, outstanding_balance)
       VALUES ('North Distributors', 'DIST-001', 50000, 10000)
       ON CONFLICT (code) DO UPDATE SET updated_at = NOW()
       RETURNING id`
    );
    const distributorId = dist.rows[0].id;

    const retailer = await client.query<{ id: string }>(
      `INSERT INTO retailers (distributor_id, name, channel, status)
       VALUES ($1, 'Retailer A', 'Modern Trade', 'active')
       ON CONFLICT DO NOTHING
       RETURNING id`,
      [distributorId]
    );
    const retailerId = retailer.rows[0]?.id;

    const superadmin = await client.query<{ id: string }>(
      `INSERT INTO users (name, email, password_hash, role, status)
       VALUES ('Super Admin', 'admin@ddms.local', $1, 'admin', 'active')
       ON CONFLICT (email) DO UPDATE SET updated_at = NOW()
       RETURNING id`,
      [password]
    );
    const distAdmin = await client.query<{ id: string }>(
      `INSERT INTO users (name, email, password_hash, role, distributor_id, status)
       VALUES ('Distributor Admin', 'distadmin@ddms.local', $1, 'distributor', $2, 'active')
       ON CONFLICT (email) DO UPDATE SET updated_at = NOW()
       RETURNING id`,
      [password, distributorId]
    );
    const dealerUser = await client.query<{ id: string }>(
      `INSERT INTO users (name, email, password_hash, role, distributor_id, status)
       VALUES ('Dealer User', 'dealer@ddms.local', $1, 'dealer', $2, 'active')
       ON CONFLICT (email) DO UPDATE SET updated_at = NOW()
       RETURNING id`,
      [password, distributorId]
    );
    const fieldRep = await client.query<{ id: string }>(
      `INSERT INTO users (name, email, password_hash, role, distributor_id, status)
       VALUES ('Field Rep', 'fieldrep@ddms.local', $1, 'field_rep', $2, 'active')
       ON CONFLICT (email) DO UPDATE SET updated_at = NOW()
       RETURNING id`,
      [password, distributorId]
    );

    const cat = await client.query<{ id: string }>(
      `INSERT INTO product_categories (name) VALUES ('Paints')
       ON CONFLICT (name) DO NOTHING
       RETURNING id`
    );
    const categoryId = cat.rows[0]?.id ?? (
      await client.query<{ id: string }>('SELECT id FROM product_categories WHERE name = $1 LIMIT 1', ['Paints'])
    ).rows[0].id;

    const priceList = await client.query<{ id: string }>(
      `INSERT INTO price_lists (name, currency, valid_from) VALUES ('Default DPL', 'USD', CURRENT_DATE)
       ON CONFLICT (name) DO NOTHING
       RETURNING id`
    );
    const priceListId = priceList.rows[0]?.id ?? (
      await client.query<{ id: string }>('SELECT id FROM price_lists WHERE name = $1 LIMIT 1', ['Default DPL'])
    ).rows[0].id;

    const product = await client.query<{ id: string }>(
      `INSERT INTO products (sku, name, uom, category_id, price_list_id, base_price)
       VALUES ('PNT-001', 'Premium Exterior Paint 20L', 'L', $1, $2, 120.00)
       ON CONFLICT (sku) DO UPDATE SET updated_at = NOW()
       RETURNING id`,
      [categoryId, priceListId]
    );
    const productId = product.rows[0].id;

    await client.query(
      `INSERT INTO price_list_items (price_list_id, product_id, price, currency)
       VALUES ($1, $2, 115.00, 'USD')
       ON CONFLICT (price_list_id, product_id) DO UPDATE SET price = EXCLUDED.price, currency = EXCLUDED.currency`,
      [priceListId, productId]
    );

    const warehouse = await client.query<{ id: string }>(
      `INSERT INTO warehouses (distributor_id, name, code)
       VALUES ($1, 'Primary DC', 'WH-001')
       ON CONFLICT (code) DO NOTHING
       RETURNING id`,
      [distributorId]
    );
    const warehouseId = warehouse.rows[0]?.id ?? (
      await client.query<{ id: string }>('SELECT id FROM warehouses WHERE code=$1 LIMIT 1', ['WH-001'])
    ).rows[0].id;

    await client.query(
      `INSERT INTO inventory_snapshots (warehouse_id, product_id, qty_on_hand, qty_reserved)
       VALUES ($1, $2, 500, 0)`,
      [warehouseId, productId]
    );

    if (retailerId) {
      const order = await client.query<{ id: string }>(
        `INSERT INTO orders (distributor_id, retailer_id, sales_rep_id, status, total_amount, notes)
         VALUES ($1, $2, $3, 'submitted', 230.00, 'Demo order')
         ON CONFLICT DO NOTHING
         RETURNING id`,
        [distributorId, retailerId, fieldRep.rows[0].id]
      );
      const orderId = order.rows[0]?.id;
      if (orderId) {
        await client.query(
          `INSERT INTO order_items (order_id, product_id, quantity, unit_price)
           VALUES ($1, $2, 2, 115.00)`,
          [orderId, productId]
        );
      }
    }

    console.log('Seed data created:');
    console.log('- Admin: admin@ddms.local / Password@123');
    console.log('- Distributor Admin: distadmin@ddms.local / Password@123');
    console.log('- Dealer: dealer@ddms.local / Password@123');
    console.log('- Field Rep: fieldrep@ddms.local / Password@123');
  });
}

seed()
  .then(() => {
    console.log('Seeding completed');
    process.exit(0);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
