import { pool } from '../../db/pool';
import type { Scheme, SchemeClaim } from './scheme.types';

export const listSchemes = async (
  status?: 'active' | 'expired' | 'upcoming',
  limit = 20,
  offset = 0
): Promise<Scheme[]> => {
  const res = await pool.query<Scheme>({
    text: `
      SELECT id,
             name,
             type,
             start_date as "startDate",
             end_date as "endDate",
             geo_scope as "geoScope",
             budget,
             created_at as "createdAt"
      FROM schemes
      WHERE ($1::text IS NULL)
        OR ($1 = 'active' AND start_date <= NOW() AND end_date >= NOW())
        OR ($1 = 'upcoming' AND start_date > NOW())
        OR ($1 = 'expired' AND end_date < NOW())
      ORDER BY start_date DESC
      LIMIT $2 OFFSET $3
    `,
    values: [status ?? null, limit, offset]
  });
  return res.rows;
};

export const createSchemeRecord = async (payload: {
  name: string;
  type: string;
  startDate: string;
  endDate: string;
  geoScope?: string;
  budget?: number;
  formula: Record<string, unknown>;
}): Promise<Scheme> => {
  const res = await pool.query<Scheme>({
    text: `
      INSERT INTO schemes (name, type, start_date, end_date, geo_scope, budget, formula)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, name, type, start_date as "startDate", end_date as "endDate",
                geo_scope as "geoScope", budget, created_at as "createdAt"
    `,
    values: [
      payload.name,
      payload.type,
      payload.startDate,
      payload.endDate,
      payload.geoScope ?? null,
      payload.budget ?? null,
      payload.formula
    ]
  });
  return res.rows[0];
};

export const createSchemeClaimRecord = async (payload: {
  schemeId: string;
  distributorId: string;
  claimedAmount: number;
  notes?: string;
}): Promise<SchemeClaim> => {
  const res = await pool.query<SchemeClaim>({
    text: `
      INSERT INTO scheme_claims (scheme_id, distributor_id, claimed_amount, status, notes)
      VALUES ($1, $2, $3, 'submitted', $4)
      RETURNING id, scheme_id as "schemeId", distributor_id as "distributorId",
                status, claimed_amount as "claimedAmount", created_at as "createdAt"
    `,
    values: [
      payload.schemeId,
      payload.distributorId,
      payload.claimedAmount,
      payload.notes ?? null
    ]
  });
  return res.rows[0];
};

export const getSchemeById = async (schemeId: string): Promise<Scheme | null> => {
  const res = await pool.query<Scheme>({
    text: `
      SELECT id,
             name,
             type,
             start_date as "startDate",
             end_date as "endDate",
             geo_scope as "geoScope",
             budget,
             formula,
             created_at as "createdAt"
      FROM schemes
      WHERE id = $1
    `,
    values: [schemeId]
  });
  return res.rows[0] ?? null;
};
