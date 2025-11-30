import { pool } from '../../db/pool';

export interface PincodeRecord {
  code: string;
  officeName: string | null;
  officeType: string | null;
  districtName: string | null;
  stateName: string | null;
}

export const searchPincodes = async (query: string, limit = 20): Promise<PincodeRecord[]> => {
  const res = await pool.query<PincodeRecord>({
    text: `
      SELECT code,
             office_name as "officeName",
             office_type as "officeType",
             district_name as "districtName",
             state_name as "stateName"
      FROM pincodes
      WHERE code LIKE $1 || '%'
         OR office_name ILIKE '%' || $1 || '%'
         OR district_name ILIKE '%' || $1 || '%'
         OR state_name ILIKE '%' || $1 || '%'
      ORDER BY code
      LIMIT $2
    `,
    values: [query, limit]
  });
  return res.rows;
};

export const pinCodesExist = async (codes: string[]): Promise<boolean> => {
  if (codes.length === 0) return false;
  const res = await pool.query({
    text: `
      SELECT COUNT(*)::int AS count
      FROM pincodes
      WHERE code = ANY($1)
    `,
    values: [codes]
  });
  const count = res.rows[0]?.count ?? 0;
  return count === codes.length;
};
