import { randomUUID } from 'node:crypto';
import { pool } from '../../db/pool';

export interface IntegrationRecord {
  id: string;
  connector: string;
  status: string;
  credentialsRef?: string | null;
}

export interface IntegrationWebhook {
  id: string;
  integrationId: string;
  eventType: string;
  targetUrl: string;
  secret: string;
  isActive: boolean;
  lastSuccessAt?: string | null;
  lastErrorAt?: string | null;
}

export interface IntegrationEvent {
  id: string;
  eventType: string;
  payload: Record<string, any>;
  status: string;
  attempts: number;
  createdAt: string;
}

export const upsertIntegration = async (
  connector: string,
  credentialsRef?: string
): Promise<IntegrationRecord> => {
  const res = await pool.query<IntegrationRecord>({
    text: `
      INSERT INTO integrations (id, connector, credentials_ref, status)
      VALUES ($1, $2, $3, 'enabled')
      ON CONFLICT (connector)
      DO UPDATE SET credentials_ref = COALESCE(EXCLUDED.credentials_ref, integrations.credentials_ref),
                    updated_at = NOW(),
                    status = 'enabled'
      RETURNING id, connector, status, credentials_ref as "credentialsRef"
    `,
    values: [randomUUID(), connector, credentialsRef ?? null]
  });
  return res.rows[0];
};

interface CreateWebhookInput {
  integrationId: string;
  eventType: string;
  targetUrl: string;
  secret: string;
}

export const createWebhook = async (
  input: CreateWebhookInput
): Promise<IntegrationWebhook> => {
  const res = await pool.query<IntegrationWebhook>({
    text: `
      INSERT INTO integration_webhooks (integration_id, event_type, target_url, secret)
      VALUES ($1, $2, $3, $4)
      RETURNING
        id,
        integration_id as "integrationId",
        event_type as "eventType",
        target_url as "targetUrl",
        secret,
        is_active as "isActive",
        last_success_at as "lastSuccessAt",
        last_error_at as "lastErrorAt"
    `,
    values: [input.integrationId, input.eventType, input.targetUrl, input.secret]
  });
  return res.rows[0];
};

export const listWebhooks = async (
  eventType?: string
): Promise<IntegrationWebhook[]> => {
  const res = await pool.query<IntegrationWebhook>({
    text: `
      SELECT
        id,
        integration_id as "integrationId",
        event_type as "eventType",
        target_url as "targetUrl",
        secret,
        is_active as "isActive",
        last_success_at as "lastSuccessAt",
        last_error_at as "lastErrorAt"
      FROM integration_webhooks
      WHERE ($1::text IS NULL OR event_type = $1)
      ORDER BY created_at DESC
    `,
    values: [eventType ?? null]
  });
  return res.rows;
};

export const insertIntegrationEvent = async (
  eventType: string,
  payload: Record<string, any>
): Promise<IntegrationEvent> => {
  const res = await pool.query<IntegrationEvent>({
    text: `
      INSERT INTO integration_events (event_type, payload, status)
      VALUES ($1, $2, 'pending')
      RETURNING
        id,
        event_type as "eventType",
        payload,
        status,
        attempts,
        created_at as "createdAt"
    `,
    values: [eventType, payload]
  });
  return res.rows[0];
};

export const fetchPendingEvents = async (
  limit: number
): Promise<IntegrationEvent[]> => {
  const res = await pool.query<IntegrationEvent>({
    text: `
      SELECT
        id,
        event_type as "eventType",
        payload,
        status,
        attempts,
        created_at as "createdAt"
      FROM integration_events
      WHERE status = 'pending'
      ORDER BY created_at ASC
      LIMIT $1
    `,
    values: [limit]
  });
  return res.rows;
};

export const findWebhooksForEvent = async (
  eventType: string
): Promise<IntegrationWebhook[]> => {
  const res = await pool.query<IntegrationWebhook>({
    text: `
      SELECT
        id,
        integration_id as "integrationId",
        event_type as "eventType",
        target_url as "targetUrl",
        secret,
        is_active as "isActive",
        last_success_at as "lastSuccessAt",
        last_error_at as "lastErrorAt"
      FROM integration_webhooks
      WHERE event_type = $1
        AND is_active = TRUE
    `,
    values: [eventType]
  });
  return res.rows;
};

export const recordWebhookDelivery = async (input: {
  webhookId: string;
  eventId: string;
  status: string;
  responseCode?: number;
  responseBody?: string | null;
  errorMessage?: string | null;
}): Promise<void> => {
  await pool.query({
    text: `
      INSERT INTO integration_webhook_deliveries
        (webhook_id, event_id, status, response_code, response_body, error_message)
      VALUES ($1, $2, $3, $4, $5, $6)
    `,
    values: [
      input.webhookId,
      input.eventId,
      input.status,
      input.responseCode ?? null,
      input.responseBody ?? null,
      input.errorMessage ?? null
    ]
  });
};

export const markWebhookSuccess = async (webhookId: string): Promise<void> => {
  await pool.query({
    text: `
      UPDATE integration_webhooks
      SET last_success_at = NOW(),
          last_error_at = NULL
      WHERE id = $1
    `,
    values: [webhookId]
  });
};

export const markWebhookError = async (webhookId: string): Promise<void> => {
  await pool.query({
    text: `
      UPDATE integration_webhooks
      SET last_error_at = NOW()
      WHERE id = $1
    `,
    values: [webhookId]
  });
};

export const updateEventStatus = async (
  id: string,
  status: 'completed' | 'pending'
): Promise<void> => {
  await pool.query({
    text: `
      UPDATE integration_events
      SET status = $2,
          attempts = attempts + 1,
          processed_at = CASE WHEN $2 = 'completed' THEN NOW() ELSE processed_at END
      WHERE id = $1
    `,
    values: [id, status]
  });
};
