import type { Request } from 'express';
import { insertAuditLog } from './audit.repository';

interface AuditContext {
  action: string;
  resource?: string;
  metadata?: Record<string, unknown>;
  userId?: string | null;
  ipAddress?: string | null;
}

export const recordAuditEvent = async (input: AuditContext): Promise<void> => {
  await insertAuditLog({
    userId: input.userId ?? null,
    action: input.action,
    resource: input.resource ?? null,
    metadata: input.metadata,
    ipAddress: input.ipAddress ?? null
  });
};

export const recordRequestAudit = async (
  req: Request,
  action: string,
  resource?: string,
  metadata?: Record<string, unknown>
): Promise<void> => {
  await recordAuditEvent({
    action,
    resource,
    metadata,
    userId: req.user?.id ?? null,
    ipAddress: req.ip ?? req.headers['x-forwarded-for']?.toString() ?? null
  });
};
