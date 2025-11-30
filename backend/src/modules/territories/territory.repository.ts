import { pool } from '../../db/pool';

export interface Territory {
  id: string;
  name: string;
  code: string;
  region: string | null;
}

export const listTerritories = async (): Promise<Territory[]> => {
  const res = await pool.query<Territory>({
    text: `
      SELECT id, name, code, region
      FROM territories
      ORDER BY name ASC
    `
  });
  return res.rows;
};
