import { pool } from '../../db/pool';
import type { Order, OrderItem, OrderStatus } from './order.types';

interface CreateOrderInput {
  distributorId: string;
  retailerId?: string;
  salesRepId?: string;
  currency: string;
  items: OrderItem[];
  notes?: string;
  totalAmount: number;
  creditHoldFlag: boolean;
}

export const getOrders = async (
  distributorId: string,
  status?: OrderStatus,
  limit = 20,
  offset = 0
): Promise<Order[]> => {
  const result = await pool.query<Order>({
    text: `
      SELECT id, distributor_id as "distributorId", retailer_id as "retailerId",
             sales_rep_id as "salesRepId", status, total_amount as "totalAmount",
             currency, credit_hold_flag as "creditHoldFlag",
             assigned_warehouse_id as "assignedWarehouseId",
             created_at as "createdAt", updated_at as "updatedAt"
      FROM orders
      WHERE distributor_id = $1
        AND ($2::text IS NULL OR status = $2::text)
      ORDER BY created_at DESC
      LIMIT $3 OFFSET $4
    `,
    values: [distributorId, status ?? null, limit, offset]
  });

  return result.rows;
};

export const getCreditHoldOrders = async (
  limit = 50,
  offset = 0
): Promise<Order[]> => {
  const result = await pool.query<Order>({
    text: `
      SELECT id, distributor_id as "distributorId", retailer_id as "retailerId",
             sales_rep_id as "salesRepId", status, total_amount as "totalAmount",
             currency, credit_hold_flag as "creditHoldFlag",
             assigned_warehouse_id as "assignedWarehouseId",
             created_at as "createdAt", updated_at as "updatedAt"
      FROM orders
      WHERE credit_hold_flag = TRUE
      ORDER BY updated_at DESC
      LIMIT $1 OFFSET $2
    `,
    values: [limit, offset]
  });
  return result.rows;
};

export const getOrderById = async (id: string): Promise<Order | null> => {
  const result = await pool.query<Order>({
    text: `
      SELECT id, distributor_id as "distributorId", retailer_id as "retailerId",
             sales_rep_id as "salesRepId", status, total_amount as "totalAmount",
             currency, credit_hold_flag as "creditHoldFlag",
             assigned_warehouse_id as "assignedWarehouseId",
             created_at as "createdAt", updated_at as "updatedAt"
      FROM orders
      WHERE id = $1
    `,
    values: [id]
  });

  return result.rows[0] ?? null;
};

export const createOrder = async (input: CreateOrderInput): Promise<Order> => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const orderResult = await client.query<Order>({
      text: `
        INSERT INTO orders (distributor_id, retailer_id, sales_rep_id, status, currency, total_amount, notes, credit_hold_flag)
        VALUES ($1, $2, $3, 'submitted', $4, $5, $6, $7)
        RETURNING id, distributor_id as "distributorId", retailer_id as "retailerId",
                  sales_rep_id as "salesRepId", status, total_amount as "totalAmount",
                  currency, created_at as "createdAt", updated_at as "updatedAt"
      `,
      values: [
        input.distributorId,
        input.retailerId ?? null,
        input.salesRepId ?? null,
        input.currency,
        input.totalAmount,
        input.notes ?? null,
        input.creditHoldFlag
      ]
    });

    const order = orderResult.rows[0];

    for (const item of input.items) {
      await client.query({
        text: `
          INSERT INTO order_items (order_id, product_id, quantity, unit_price, scheme_id, discount_amount)
          VALUES ($1, $2, $3, $4, $5, $6)
        `,
        values: [
          order.id,
          item.productId,
          item.quantity,
          item.unitPrice,
          item.schemeId ?? null,
          item.discountAmount ?? 0
        ]
      });
    }

    await client.query('COMMIT');
    return order;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

export const updateOrderStatus = async (
  id: string,
  status: OrderStatus,
  comment?: string
): Promise<Order> => {
  const result = await pool.query<Order>({
    text: `
      UPDATE orders
      SET status = $2,
          approval_comment = COALESCE($3, approval_comment),
          updated_at = NOW()
      WHERE id = $1
      RETURNING id, distributor_id as "distributorId", retailer_id as "retailerId",
                sales_rep_id as "salesRepId", status, total_amount as "totalAmount",
                currency, credit_hold_flag as "creditHoldFlag",
                assigned_warehouse_id as "assignedWarehouseId",
                created_at as "createdAt", updated_at as "updatedAt"
    `,
    values: [id, status, comment ?? null]
  });

  if (result.rowCount === 0) {
    throw new Error('Order not found');
  }
  return result.rows[0];
};

export const createReturnRecord = async (input: {
  parentOrderId: string;
  distributorId: string;
  reason: string;
  refundAmount: number;
}): Promise<void> => {
  await pool.query({
    text: `
      INSERT INTO returns (parent_order_id, distributor_id, reason, status, refund_amount)
      VALUES ($1, $2, $3, 'submitted', $4)
    `,
    values: [input.parentOrderId, input.distributorId, input.reason, input.refundAmount]
  });
};

export interface OrderReturn {
  id: string;
  parentOrderId: string;
  distributorId: string;
  reason: string;
  refundAmount: number;
  status: string;
  createdAt: string;
}

export const getReturnsByDistributor = async (
  distributorId: string,
  limit = 20,
  offset = 0
): Promise<OrderReturn[]> => {
  const res = await pool.query<OrderReturn>({
    text: `
      SELECT id,
             parent_order_id as "parentOrderId",
             distributor_id as "distributorId",
             reason,
             refund_amount as "refundAmount",
             status,
             created_at as "createdAt"
      FROM returns
      WHERE distributor_id = $1
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3
    `,
    values: [distributorId, limit, offset]
  });
  return res.rows;
};
export const releaseCreditHold = async (id: string): Promise<Order | null> => {
  const res = await pool.query<Order>({
    text: `
      UPDATE orders
      SET credit_hold_flag = FALSE,
          updated_at = NOW()
      WHERE id = $1
        AND credit_hold_flag = TRUE
      RETURNING id, distributor_id as "distributorId", total_amount as "totalAmount",
                status, retailer_id as "retailerId", sales_rep_id as "salesRepId",
                currency, created_at as "createdAt", updated_at as "updatedAt"
    `,
    values: [id]
  });
  return res.rows[0] ?? null;
};
