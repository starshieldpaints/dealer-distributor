import { pool } from '../../db/pool';

interface AuditLogInsert {
  userId?: string | null;
  action: string;
  resource?: string | null;
  metadata?: Record<string, unknown>;
  ipAddress?: string | null;
}

export const insertAuditLog = async (input: AuditLogInsert): Promise<void> => {
  await pool.query({
    text: `
      INSERT INTO audit_logs (user_id, action, resource, metadata, ip_address)
      VALUES ($1, $2, $3, $4::jsonb, $5::inet)
    `,
    values: [
      input.userId ?? null,
      input.action,
      input.resource ?? null,
      input.metadata ? JSON.stringify(input.metadata) : null,
      input.ipAddress ?? null
    ]
  });
};
