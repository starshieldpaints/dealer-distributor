import { pool } from '../../db/pool';

export const assignUserPins = async (userId: string, pinCodes: string[]): Promise<void> => {
  if (!pinCodes.length) return;
  const values: any[] = [];
  const rows: string[] = [];
  let index = 1;
  for (const pin of pinCodes) {
    rows.push(`($${index++}, $${index++})`);
    values.push(userId, pin);
  }
  await pool.query({
    text: `
      INSERT INTO user_pin_assignments (user_id, pincode)
      VALUES ${rows.join(',')}
      ON CONFLICT (user_id, pincode) DO NOTHING
    `,
    values
  });
};

export const replaceUserPins = async (userId: string, pinCodes: string[]): Promise<void> => {
  await pool.query({
    text: `DELETE FROM user_pin_assignments WHERE user_id = $1`,
    values: [userId]
  });
  await assignUserPins(userId, pinCodes);
};

export const getPinsForUser = async (userId: string): Promise<string[]> => {
  const res = await pool.query<{ pincode: string }>({
    text: `SELECT pincode FROM user_pin_assignments WHERE user_id = $1 ORDER BY pincode`,
    values: [userId]
  });
  return res.rows.map((row) => row.pincode);
};
