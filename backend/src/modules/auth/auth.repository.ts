import { pool } from '../../db/pool';

export interface RefreshTokenRecord {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  replacedBy: string | null;
  revokedAt: Date | null;
  metadata: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: Date;
}

const mapRefreshToken = (row: any): RefreshTokenRecord => ({
  id: row.id,
  userId: row.user_id,
  tokenHash: row.token_hash,
  expiresAt: row.expires_at,
  replacedBy: row.replaced_by,
  revokedAt: row.revoked_at,
  metadata: row.metadata ?? null,
  ipAddress: row.ip_address,
  userAgent: row.user_agent,
  createdAt: row.created_at
});

export const insertRefreshToken = async (input: {
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  metadata?: Record<string, unknown>;
  ipAddress?: string | null;
  userAgent?: string | null;
}): Promise<RefreshTokenRecord> => {
  const res = await pool.query({
    text: `
      INSERT INTO auth_refresh_tokens (user_id, token_hash, expires_at, metadata, ip_address, user_agent)
      VALUES ($1, $2, $3, $4::jsonb, $5::inet, $6)
      RETURNING id,
                user_id,
                token_hash,
                expires_at,
                replaced_by,
                revoked_at,
                metadata,
                ip_address,
                user_agent,
                created_at
    `,
    values: [
      input.userId,
      input.tokenHash,
      input.expiresAt,
      input.metadata ? JSON.stringify(input.metadata) : null,
      input.ipAddress ?? null,
      input.userAgent ?? null
    ]
  });
  return mapRefreshToken(res.rows[0]);
};

export const findRefreshTokenByHash = async (
  tokenHash: string
): Promise<RefreshTokenRecord | null> => {
  const res = await pool.query({
    text: `
      SELECT id,
             user_id,
             token_hash,
             expires_at,
             replaced_by,
             revoked_at,
             metadata,
             ip_address,
             user_agent,
             created_at
      FROM auth_refresh_tokens
      WHERE token_hash = $1
      LIMIT 1
    `,
    values: [tokenHash]
  });
  return res.rows[0] ? mapRefreshToken(res.rows[0]) : null;
};

export const revokeRefreshToken = async (
  tokenId: string,
  replacedBy?: string | null
): Promise<void> => {
  await pool.query({
    text: `
      UPDATE auth_refresh_tokens
      SET revoked_at = NOW(),
          replaced_by = COALESCE($2, replaced_by)
      WHERE id = $1
    `,
    values: [tokenId, replacedBy ?? null]
  });
};

export const revokeUserRefreshTokens = async (userId: string): Promise<void> => {
  await pool.query({
    text: `
      UPDATE auth_refresh_tokens
      SET revoked_at = NOW()
      WHERE user_id = $1
        AND revoked_at IS NULL
    `,
    values: [userId]
  });
};

export interface PasswordResetTokenRecord {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  consumedAt: Date | null;
  createdAt: Date;
}

const mapPasswordReset = (row: any): PasswordResetTokenRecord => ({
  id: row.id,
  userId: row.user_id,
  tokenHash: row.token_hash,
  expiresAt: row.expires_at,
  consumedAt: row.consumed_at,
  createdAt: row.created_at
});

export const insertPasswordResetToken = async (input: {
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  ipAddress?: string | null;
}): Promise<PasswordResetTokenRecord> => {
  const res = await pool.query({
    text: `
      INSERT INTO password_reset_tokens (user_id, token_hash, expires_at, ip_address)
      VALUES ($1, $2, $3, $4::inet)
      RETURNING id,
                user_id,
                token_hash,
                expires_at,
                consumed_at,
                created_at
    `,
    values: [input.userId, input.tokenHash, input.expiresAt, input.ipAddress ?? null]
  });
  return mapPasswordReset(res.rows[0]);
};

export const findPasswordResetByHash = async (
  tokenHash: string
): Promise<PasswordResetTokenRecord | null> => {
  const res = await pool.query({
    text: `
      SELECT id,
             user_id,
             token_hash,
             expires_at,
             consumed_at,
             created_at
      FROM password_reset_tokens
      WHERE token_hash = $1
      LIMIT 1
    `,
    values: [tokenHash]
  });
  return res.rows[0] ? mapPasswordReset(res.rows[0]) : null;
};

export const consumePasswordResetToken = async (tokenId: string): Promise<void> => {
  await pool.query({
    text: `
      UPDATE password_reset_tokens
      SET consumed_at = NOW()
      WHERE id = $1
    `,
    values: [tokenId]
  });
};

export interface MfaSecretRecord {
  id: string;
  userId: string;
  method: 'totp' | 'sms';
  secret: string;
  backupCodes: string[];
  isVerified: boolean;
  verifiedAt: Date | null;
}

const mapMfaSecret = (row: any): MfaSecretRecord => ({
  id: row.id,
  userId: row.user_id,
  method: row.method,
  secret: row.secret,
  backupCodes: row.backup_codes ?? [],
  isVerified: row.is_verified,
  verifiedAt: row.verified_at ?? null
});

export const upsertMfaSecret = async (input: {
  userId: string;
  secret: string;
  method: 'totp' | 'sms';
  backupCodes?: string[];
}): Promise<MfaSecretRecord> => {
  const res = await pool.query({
    text: `
      INSERT INTO mfa_secrets (user_id, secret, method, backup_codes, is_verified)
      VALUES ($1, $2, $3, $4::text[], FALSE)
      ON CONFLICT (user_id)
      DO UPDATE SET secret = EXCLUDED.secret,
                    method = EXCLUDED.method,
                    backup_codes = EXCLUDED.backup_codes,
                    is_verified = FALSE,
                    verified_at = NULL,
                    updated_at = NOW()
      RETURNING id,
                user_id,
                method,
                secret,
                backup_codes,
                is_verified,
                verified_at
    `,
    values: [input.userId, input.secret, input.method, input.backupCodes ?? []]
  });
  return mapMfaSecret(res.rows[0]);
};

export const getMfaSecretForUser = async (
  userId: string
): Promise<MfaSecretRecord | null> => {
  const res = await pool.query({
    text: `
      SELECT id,
             user_id,
             method,
             secret,
             backup_codes,
             is_verified,
             verified_at
      FROM mfa_secrets
      WHERE user_id = $1
      LIMIT 1
    `,
    values: [userId]
  });
  return res.rows[0] ? mapMfaSecret(res.rows[0]) : null;
};

export const markMfaSecretVerified = async (userId: string): Promise<void> => {
  await pool.query({
    text: `
      UPDATE mfa_secrets
      SET is_verified = TRUE,
          verified_at = NOW()
      WHERE user_id = $1
    `,
    values: [userId]
  });
};

export const deleteMfaSecret = async (userId: string): Promise<void> => {
  await pool.query({
    text: `DELETE FROM mfa_secrets WHERE user_id = $1`,
    values: [userId]
  });
};

export interface MfaChallengeRecord {
  id: string;
  userId: string;
  channel: string;
  codeHash: string;
  expiresAt: Date;
  consumedAt: Date | null;
}

const mapMfaChallenge = (row: any): MfaChallengeRecord => ({
  id: row.id,
  userId: row.user_id,
  channel: row.channel,
  codeHash: row.code_hash,
  expiresAt: row.expires_at,
  consumedAt: row.consumed_at ?? null
});

export const createMfaChallenge = async (input: {
  userId: string;
  channel: string;
  codeHash: string;
  expiresAt: Date;
  ipAddress?: string | null;
}): Promise<MfaChallengeRecord> => {
  const res = await pool.query({
    text: `
      INSERT INTO mfa_challenges (user_id, channel, code_hash, expires_at, ip_address)
      VALUES ($1, $2, $3, $4, $5::inet)
      RETURNING id,
                user_id,
                channel,
                code_hash,
                expires_at,
                consumed_at
    `,
    values: [input.userId, input.channel, input.codeHash, input.expiresAt, input.ipAddress ?? null]
  });
  return mapMfaChallenge(res.rows[0]);
};

export const findActiveMfaChallenge = async (
  challengeId: string
): Promise<MfaChallengeRecord | null> => {
  const res = await pool.query({
    text: `
      SELECT id,
             user_id,
             channel,
             code_hash,
             expires_at,
             consumed_at
      FROM mfa_challenges
      WHERE id = $1
        AND consumed_at IS NULL
    `,
    values: [challengeId]
  });
  const row = res.rows[0];
  if (!row) {
    return null;
  }
  return mapMfaChallenge(row);
};

export const consumeMfaChallenge = async (challengeId: string): Promise<void> => {
  await pool.query({
    text: `
      UPDATE mfa_challenges
      SET consumed_at = NOW()
      WHERE id = $1
    `,
    values: [challengeId]
  });
};
