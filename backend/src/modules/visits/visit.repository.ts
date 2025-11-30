import { pool } from '../../db/pool';
import type { Visit } from './visit.types';

export const listVisits = async (
  salesRepId: string,
  limit = 50,
  offset = 0
): Promise<Visit[]> => {
  const res = await pool.query<Visit>({
    text: `
      SELECT id,
             sales_rep_id as "salesRepId",
             retailer_id as "retailerId",
             check_in_time as "checkInTime",
             check_out_time as "checkOutTime",
             status,
             notes,
             created_at as "createdAt"
      FROM visits
      WHERE sales_rep_id = $1
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3
    `,
    values: [salesRepId, limit, offset]
  });
  return res.rows;
};

export const createVisit = async (input: {
  salesRepId: string;
  retailerId?: string;
  checkInTime?: string;
  status?: string;
  notes?: string;
}): Promise<Visit> => {
  const res = await pool.query<Visit>({
    text: `
      INSERT INTO visits (sales_rep_id, retailer_id, check_in_time, status, notes)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, sales_rep_id as "salesRepId", retailer_id as "retailerId",
                check_in_time as "checkInTime", status, notes, created_at as "createdAt"
    `,
    values: [
      input.salesRepId,
      input.retailerId ?? null,
      input.checkInTime ?? new Date().toISOString(),
      input.status ?? 'in-progress',
      input.notes ?? null
    ]
  });
  return res.rows[0];
};

export const updateVisitCheckout = async (
  id: string,
  checkOutTime: string,
  status?: string,
  notes?: string
): Promise<Visit | null> => {
  const res = await pool.query<Visit>({
    text: `
      UPDATE visits
      SET check_out_time = $2,
          status = COALESCE($3, status),
          notes = COALESCE($4, notes)
      WHERE id = $1
      RETURNING id, sales_rep_id as "salesRepId", retailer_id as "retailerId",
                check_in_time as "checkInTime", check_out_time as "checkOutTime",
                status, notes, created_at as "createdAt"
    `,
    values: [id, checkOutTime, status ?? null, notes ?? null]
  });
  return res.rows[0] ?? null;
};
