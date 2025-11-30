import { pool } from '../../db/pool';
import type { InventorySnapshot } from './inventory.types';
interface ListInventoryInput {
  warehouseId?: string;
  distributorId?: string;
  productId?: string;
  limit?: number;
  offset?: number;
}

export const getInventorySnapshots = async (
  input: ListInventoryInput
): Promise<InventorySnapshot[]> => {
  const res = await pool.query<InventorySnapshot>({
    text: `
      SELECT
        s.warehouse_id as "warehouseId",
        w.name as "warehouseName",
        s.product_id as "productId",
        p.sku as "sku",
        s.qty_on_hand as "quantityOnHand",
        s.qty_reserved as "quantityReserved",
        s.snapshot_ts as "snapshotTs"
      FROM inventory_snapshots s
      INNER JOIN warehouses w ON w.id = s.warehouse_id
      INNER JOIN products p ON p.id = s.product_id
      WHERE ($1::uuid IS NULL OR s.warehouse_id = $1)
        AND ($2::uuid IS NULL OR p.id = $2)
        AND ($3::uuid IS NULL OR w.distributor_id = $3)
      ORDER BY s.snapshot_ts DESC
      LIMIT $4 OFFSET $5
    `,
    values: [
      input.warehouseId ?? null,
      input.productId ?? null,
      input.distributorId ?? null,
      input.limit ?? 50,
      input.offset ?? 0
    ]
  });
  return res.rows;
};

interface InventoryAdjustment {
  warehouseId: string;
  adjustments: Array<{
    productId: string;
    delta: number;
    reason: string;
  }>;
}

export const applyInventoryAdjustments = async (
  input: InventoryAdjustment
): Promise<void> => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const adj of input.adjustments) {
      await client.query({
        text: `
          INSERT INTO inventory_movements (warehouse_id, product_id, delta, reason)
          VALUES ($1, $2, $3, $4)
        `,
        values: [input.warehouseId, adj.productId, adj.delta, adj.reason]
      });

      await client.query({
        text: `
          INSERT INTO inventory_snapshots (warehouse_id, product_id, qty_on_hand, qty_reserved, snapshot_ts)
          VALUES ($1, $2,
            (SELECT COALESCE(qty_on_hand,0) FROM inventory_snapshots
             WHERE warehouse_id = $1 AND product_id = $2
             ORDER BY snapshot_ts DESC LIMIT 1) + $3,
            (SELECT COALESCE(qty_reserved,0) FROM inventory_snapshots
             WHERE warehouse_id = $1 AND product_id = $2
             ORDER BY snapshot_ts DESC LIMIT 1),
            NOW()
          )
        `,
        values: [input.warehouseId, adj.productId, adj.delta]
      });
    }
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

export const transferInventory = async (params: {
  fromWarehouseId: string;
  toWarehouseId: string;
  items: Array<{ productId: string; quantity: number; reason: string }>;
}): Promise<void> => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const item of params.items) {
      // deduct from source
      await client.query(
        'INSERT INTO inventory_movements (warehouse_id, product_id, delta, reason) VALUES ($1,$2,$3,$4)',
        [params.fromWarehouseId, item.productId, -Math.abs(item.quantity), `transfer out: ${item.reason}`]
      );
      await client.query(
        `
        INSERT INTO inventory_snapshots (warehouse_id, product_id, qty_on_hand, qty_reserved, snapshot_ts)
        VALUES ($1, $2,
          (SELECT COALESCE(qty_on_hand,0) FROM inventory_snapshots WHERE warehouse_id=$1 AND product_id=$2 ORDER BY snapshot_ts DESC LIMIT 1) - $3,
          (SELECT COALESCE(qty_reserved,0) FROM inventory_snapshots WHERE warehouse_id=$1 AND product_id=$2 ORDER BY snapshot_ts DESC LIMIT 1),
          NOW()
        )
        `,
        [params.fromWarehouseId, item.productId, item.quantity]
      );

      // add to destination
      await client.query(
        'INSERT INTO inventory_movements (warehouse_id, product_id, delta, reason) VALUES ($1,$2,$3,$4)',
        [params.toWarehouseId, item.productId, item.quantity, `transfer in: ${item.reason}`]
      );
      await client.query(
        `
        INSERT INTO inventory_snapshots (warehouse_id, product_id, qty_on_hand, qty_reserved, snapshot_ts)
        VALUES ($1, $2,
          (SELECT COALESCE(qty_on_hand,0) FROM inventory_snapshots WHERE warehouse_id=$1 AND product_id=$2 ORDER BY snapshot_ts DESC LIMIT 1) + $3,
          (SELECT COALESCE(qty_reserved,0) FROM inventory_snapshots WHERE warehouse_id=$1 AND product_id=$2 ORDER BY snapshot_ts DESC LIMIT 1),
          NOW()
        )
        `,
        [params.toWarehouseId, item.productId, item.quantity]
      );
    }
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

export const listWarehouses = async (distributorId?: string) => {
  const res = await pool.query({
    text: `
      SELECT id, distributor_id as "distributorId", name, code, created_at as "createdAt", updated_at as "updatedAt"
      FROM warehouses
      WHERE ($1::uuid IS NULL OR distributor_id = $1)
      ORDER BY created_at DESC
    `,
    values: [distributorId ?? null]
  });
  return res.rows;
};
