import { pool } from '../../db/pool';

export interface DistributorCredit {
  id: string;
  creditLimit: number;
  outstandingBalance: number;
}

export interface DistributorSummary {
  id: string;
  name: string;
  code: string;
  parentId?: string | null;
  territoryId?: string | null;
  currency: string;
  creditLimit: number;
  outstandingBalance: number;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface RetailerSummary {
  id: string;
  distributorId: string;
  name: string;
  channel?: string | null;
  geoLat?: number | null;
  geoLng?: number | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export const getDistributorCredit = async (
  id: string
): Promise<DistributorCredit | null> => {
  const res = await pool.query<DistributorCredit>({
    text: `
      SELECT id,
             credit_limit as "creditLimit",
             outstanding_balance as "outstandingBalance"
      FROM distributors
      WHERE id = $1
    `,
    values: [id]
  });
  return res.rows[0] ?? null;
};

export const incrementOutstandingBalance = async (
  id: string,
  delta: number
): Promise<void> => {
  await pool.query({
    text: `
      UPDATE distributors
      SET outstanding_balance = COALESCE(outstanding_balance,0) + $2,
          updated_at = NOW()
      WHERE id = $1
    `,
    values: [id, delta]
  });
};

interface DistributorFilter {
  parentId?: string;
  territoryId?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export const listDistributors = async (
  filter: DistributorFilter
): Promise<DistributorSummary[]> => {
  const res = await pool.query<DistributorSummary>({
    text: `
      SELECT
        id,
        name,
        code,
        parent_id as "parentId",
        territory_id as "territoryId",
        currency,
        credit_limit as "creditLimit",
        outstanding_balance as "outstandingBalance",
        status,
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM distributors
      WHERE ($1::uuid IS NULL OR parent_id = $1)
        AND ($2::uuid IS NULL OR territory_id = $2)
        AND (
          $3::text IS NULL
          OR name ILIKE '%' || $3 || '%'
          OR code ILIKE '%' || $3 || '%'
        )
      ORDER BY name
      LIMIT $4 OFFSET $5
    `,
    values: [
      filter.parentId ?? null,
      filter.territoryId ?? null,
      filter.search ?? null,
      filter.limit ?? 50,
      filter.offset ?? 0
    ]
  });
  return res.rows;
};

export const getDistributorById = async (
  id: string
): Promise<DistributorSummary | null> => {
  const res = await pool.query<DistributorSummary>({
    text: `
      SELECT
        id,
        name,
        code,
        parent_id as "parentId",
        territory_id as "territoryId",
        currency,
        credit_limit as "creditLimit",
        outstanding_balance as "outstandingBalance",
        status,
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM distributors
      WHERE id = $1
    `,
    values: [id]
  });
  return res.rows[0] ?? null;
};

interface CreateDistributorInput {
  name: string;
  code: string;
  parentId?: string;
  territoryId?: string;
  currency?: string;
  creditLimit?: number;
}

export const createDistributor = async (
  input: CreateDistributorInput
): Promise<DistributorSummary> => {
  const res = await pool.query<DistributorSummary>({
    text: `
      INSERT INTO distributors (name, code, parent_id, territory_id, currency, credit_limit, status)
      VALUES ($1, $2, $3, $4, $5, $6, 'active')
      RETURNING
        id,
        name,
        code,
        parent_id as "parentId",
        territory_id as "territoryId",
        currency,
        credit_limit as "creditLimit",
        outstanding_balance as "outstandingBalance",
        status,
        created_at as "createdAt",
        updated_at as "updatedAt"
    `,
    values: [
      input.name,
      input.code,
      input.parentId ?? null,
      input.territoryId ?? null,
      input.currency ?? 'USD',
      input.creditLimit ?? 0
    ]
  });
  return res.rows[0];
};

interface RetailerFilter {
  search?: string;
  status?: string;
  limit?: number;
  offset?: number;
}

export const listRetailers = async (
  distributorId: string,
  filter: RetailerFilter
): Promise<RetailerSummary[]> => {
  const res = await pool.query<RetailerSummary>({
    text: `
      SELECT
        id,
        distributor_id as "distributorId",
        name,
        channel,
        geo_lat as "geoLat",
        geo_lng as "geoLng",
        status,
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM retailers
      WHERE distributor_id = $1
        AND ($2::text IS NULL OR status = $2)
        AND (
          $3::text IS NULL
          OR name ILIKE '%' || $3 || '%'
        )
      ORDER BY name
      LIMIT $4 OFFSET $5
    `,
    values: [
      distributorId,
      filter.status ?? null,
      filter.search ?? null,
      filter.limit ?? 50,
      filter.offset ?? 0
    ]
  });
  return res.rows;
};

interface CreateRetailerInput {
  distributorId: string;
  name: string;
  channel?: string;
  address?: Record<string, any>;
  geoLat?: number;
  geoLng?: number;
}

export const createRetailer = async (
  input: CreateRetailerInput
): Promise<RetailerSummary> => {
  const res = await pool.query<RetailerSummary>({
    text: `
      INSERT INTO retailers (distributor_id, name, channel, address, geo_lat, geo_lng, status)
      VALUES ($1, $2, $3, $4, $5, $6, 'active')
      RETURNING
        id,
        distributor_id as "distributorId",
        name,
        channel,
        geo_lat as "geoLat",
        geo_lng as "geoLng",
        status,
        created_at as "createdAt",
        updated_at as "updatedAt"
    `,
    values: [
      input.distributorId,
      input.name,
      input.channel ?? null,
      input.address ?? null,
      input.geoLat ?? null,
      input.geoLng ?? null
    ]
  });
  return res.rows[0];
};
