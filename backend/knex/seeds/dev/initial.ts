import { randomBytes } from 'crypto';
import type { Knex } from 'knex';
import { hashPassword } from '../../../src/lib/password';

export async function seed(knex: Knex): Promise<void> {
  await knex.transaction(async (trx) => {
    const [territory] = await trx('territories')
      .insert({
        name: 'West Cluster',
        code: 'WEST',
        region: 'West'
      })
      .onConflict('code')
      .merge()
      .returning(['id']);
    const territoryId = territory.id as string;

    const [distributor] = await trx('distributors')
      .insert({
        name: 'Alpha Distribution',
        code: 'ALPHA001',
        territory_id: territoryId,
        credit_limit: 500000,
        currency: 'USD'
      })
      .onConflict('code')
      .merge()
      .returning(['id']);
    const distributorId = distributor.id as string;

    const retailers = [
      { name: 'Urban Retail Mart', channel: 'modern_trade' },
      { name: 'Neighborhood Pharmacy', channel: 'pharmacy' }
    ];

    for (const retailer of retailers) {
      const existingRetailer = await trx('retailers')
        .where({
          distributor_id: distributorId,
          name: retailer.name
        })
        .first();
      if (!existingRetailer) {
        await trx('retailers').insert({
          distributor_id: distributorId,
          name: retailer.name,
          channel: retailer.channel,
          status: 'active'
        });
      }
    }

    const [warehouse] = await trx('warehouses')
      .insert({
        name: 'Alpha Central DC',
        code: 'ALPHA-DC1',
        distributor_id: distributorId,
        location: { city: 'Los Angeles', country: 'US' }
      })
      .onConflict('code')
      .merge()
      .returning(['id']);
    const warehouseId = warehouse.id as string;

    const existingPriceList = await trx('price_lists')
      .where({ name: 'Base US Price List' })
      .first();
    let priceListId: string;
    if (existingPriceList) {
      const updated = await trx('price_lists')
        .update({
          currency: 'USD',
          valid_from: trx.fn.now()
        })
        .where({ id: existingPriceList.id })
        .returning(['id']);
      priceListId = updated[0].id as string;
    } else {
      const [created] = await trx('price_lists')
        .insert({
          name: 'Base US Price List',
          currency: 'USD',
          valid_from: trx.fn.now()
        })
        .returning(['id']);
      priceListId = created.id as string;
    }

    const catalogItems = [
      {
        sku: 'SKU-1001',
        name: 'Energy Drink 500ml',
        uom: 'bottle',
        basePrice: 25
      },
      {
        sku: 'SKU-1002',
        name: 'Protein Bar Pack',
        uom: 'box',
        basePrice: 32
      },
      {
        sku: 'SKU-1003',
        name: 'Vitamin Tablets',
        uom: 'bottle',
        basePrice: 18
      }
    ];

    for (const product of catalogItems) {
      const [productRow] = await trx('products')
        .insert({
          sku: product.sku,
          name: product.name,
          uom: product.uom,
          price_list_id: priceListId,
          base_price: product.basePrice
        })
        .onConflict('sku')
        .merge()
        .returning(['id']);
      const productId = productRow.id as string;

      await trx('price_list_items')
        .insert({
          price_list_id: priceListId,
          product_id: productId,
          price: product.basePrice,
          currency: 'USD'
        })
        .onConflict(['price_list_id', 'product_id'])
        .merge({
          price: product.basePrice,
          currency: 'USD'
        });

      const snapshotExists = await trx('inventory_snapshots')
        .where({
          warehouse_id: warehouseId,
          product_id: productId
        })
        .first();
      if (!snapshotExists) {
        await trx('inventory_snapshots').insert({
          warehouse_id: warehouseId,
          product_id: productId,
          qty_on_hand: 100,
          qty_reserved: 0
        });
      }
    }

    const adminPassword = await hashPassword('Admin@12345!');
    await trx('users')
      .insert({
        name: 'Global Admin',
        email: 'admin@ddms.io',
        password_hash: adminPassword,
        role: 'admin',
        status: 'active'
      })
      .onConflict('email')
      .ignore();

    const distributorPassword = await hashPassword('Distributor@12345!');
    await trx('users')
      .insert({
        name: 'Alpha Ops',
        email: 'ops@alpha.com',
        password_hash: distributorPassword,
        role: 'distributor',
        distributor_id: distributorId,
        status: 'active'
      })
      .onConflict('email')
      .ignore();

    const connectors = [
      {
        connector: 'sap-erp',
        credentialsRef: 'aws-secretsmanager:erp/sap',
        webhooks: [
          {
            eventType: 'order.created',
            url: 'https://sap.alpha.com/hooks/orders'
          },
          {
            eventType: 'stock.updated',
            url: 'https://sap.alpha.com/hooks/stock'
          }
        ]
      },
      {
        connector: 'salesforce-crm',
        credentialsRef: 'vault:crm/salesforce',
        webhooks: [
          {
            eventType: 'order.delivered',
            url: 'https://crm.alpha.com/hooks/orders'
          },
          {
            eventType: 'payment.collected',
            url: 'https://crm.alpha.com/hooks/payments'
          }
        ]
      }
    ];

    for (const connector of connectors) {
      const [integration] = await trx('integrations')
        .insert({
          connector: connector.connector,
          credentials_ref: connector.credentialsRef,
          status: 'enabled'
        })
        .onConflict('connector')
        .merge({
          credentials_ref: connector.credentialsRef,
          status: 'enabled',
          updated_at: trx.fn.now()
        })
        .returning(['id']);
      const integrationId = integration.id as string;

      for (const hook of connector.webhooks) {
        const secret = randomBytes(24).toString('hex');
        await trx('integration_webhooks')
          .insert({
            integration_id: integrationId,
            event_type: hook.eventType,
            target_url: hook.url,
            secret,
            is_active: true
          })
          .onConflict(['integration_id', 'event_type', 'target_url'])
          .ignore();
      }
    }
  });
}
