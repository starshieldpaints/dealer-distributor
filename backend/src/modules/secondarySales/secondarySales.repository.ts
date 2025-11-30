import { pool } from '../../db/pool';
import type { SecondarySale } from './secondarySales.types';

export const listSecondarySales = async (
  distributorId: string,
  limit = 50,
  offset = 0
): Promise<SecondarySale[]> => {
  const res = await pool.query<SecondarySale>({
    text: `
      SELECT id,
             distributor_id as "distributorId",
             retailer_id as "retailerId",
             product_id as "productId",
             quantity,
             amount,
             sale_date as "saleDate",
             captured_by as "capturedBy",
             created_at as "createdAt"
      FROM secondary_sales
      WHERE distributor_id = $1
      ORDER BY sale_date DESC, created_at DESC
      LIMIT $2 OFFSET $3
    `,
    values: [distributorId, limit, offset]
  });
  return res.rows;
};

export const createSecondarySale = async (input: {
  distributorId: string;
  retailerId: string;
  productId: string;
  quantity: number;
  amount: number;
  saleDate: string;
  capturedBy?: string;
}): Promise<SecondarySale> => {
  const res = await pool.query<SecondarySale>({
    text: `
      INSERT INTO secondary_sales (distributor_id, retailer_id, product_id, quantity, amount, sale_date, captured_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id,
                distributor_id as "distributorId",
                retailer_id as "retailerId",
                product_id as "productId",
                quantity,
                amount,
                sale_date as "saleDate",
                captured_by as "capturedBy",
                created_at as "createdAt"
    `,
    values: [
      input.distributorId,
      input.retailerId,
      input.productId,
      input.quantity,
      input.amount,
      input.saleDate,
      input.capturedBy ?? null
    ]
  });
  return res.rows[0];
};
