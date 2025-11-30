import { pool } from '../../db/pool';

export type VerificationChannel = 'email' | 'phone';

export interface VerificationCodeRecord {
  id: string;
  userId: string;
  channel: VerificationChannel;
  destination: string;
  code: string;
  expiresAt: Date;
  consumedAt: Date | null;
}

export const createVerificationCode = async (input: {
  userId: string;
  channel: VerificationChannel;
  destination: string;
  code: string;
  expiresAt: Date;
}): Promise<void> => {
  await pool.query({
    text: `
      INSERT INTO contact_verification_codes (
        user_id,
        channel,
        destination,
        code,
        expires_at
      )
      VALUES ($1, $2, $3, $4, $5)
    `,
    values: [input.userId, input.channel, input.destination, input.code, input.expiresAt]
  });
};

export const findActiveCode = async (
  userId: string,
  channel: VerificationChannel,
  code: string
): Promise<VerificationCodeRecord | null> => {
  const res = await pool.query<VerificationCodeRecord>({
    text: `
      SELECT id,
             user_id as "userId",
             channel,
             destination,
             code,
             expires_at as "expiresAt",
             consumed_at as "consumedAt"
      FROM contact_verification_codes
      WHERE user_id = $1
        AND channel = $2
        AND code = $3
        AND consumed_at IS NULL
      ORDER BY created_at DESC
      LIMIT 1
    `,
    values: [userId, channel, code]
  });
  return res.rows[0] ?? null;
};

export const consumeCode = async (id: string): Promise<void> => {
  await pool.query({
    text: `
      UPDATE contact_verification_codes
      SET consumed_at = NOW()
      WHERE id = $1
    `,
    values: [id]
  });
};
