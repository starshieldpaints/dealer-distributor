import { createHmac, randomBytes } from 'node:crypto';
import type { Request } from 'express';
import { HttpError } from '../../lib/httpError';
import { logger } from '../../logger';
import {
  createWebhook,
  fetchPendingEvents,
  findWebhooksForEvent,
  insertIntegrationEvent,
  listWebhooks,
  markWebhookError,
  markWebhookSuccess,
  recordWebhookDelivery,
  updateEventStatus,
  upsertIntegration
} from './integration.repository';
import { recordAuditEvent } from '../audit/audit.service';

let dispatchInFlight = false;

const ensureAdmin = (user: Request['user'] | undefined): void => {
  if (!user || user.role !== 'admin') {
    throw new HttpError(403, 'Admin privileges required');
  }
};

interface RegisterWebhookInput {
  connector: string;
  eventType: string;
  targetUrl: string;
  secret?: string;
  credentialsRef?: string;
}

export const registerWebhookEndpoint = async (
  input: RegisterWebhookInput,
  user: Request['user'] | undefined
) => {
  ensureAdmin(user);
  const integration = await upsertIntegration(
    input.connector,
    input.credentialsRef
  );
  const secret =
    input.secret ??
    randomBytes(32)
      .toString('base64')
      .replace(/[^a-zA-Z0-9]/g, '')
      .slice(0, 32);
  const webhook = await createWebhook({
    integrationId: integration.id,
    eventType: input.eventType,
    targetUrl: input.targetUrl,
    secret
  });
  await recordAuditEvent({
    action: 'integration.webhook_registered',
    resource: 'integration',
    userId: user?.id ?? null,
    metadata: {
      integrationId: integration.id,
      eventType: input.eventType,
      targetUrl: input.targetUrl
    }
  });
  return webhook;
};

export const listRegisteredWebhooks = async (
  eventType?: string,
  user?: Request['user']
) => {
  ensureAdmin(user);
  return await listWebhooks(eventType);
};

export const emitIntegrationEvent = async (
  eventType: string,
  payload: Record<string, any>
): Promise<void> => {
  await insertIntegrationEvent(eventType, payload);
  void dispatchPendingIntegrationEvents().catch((error) => {
    logger.error(
      { err: error },
      'Failed dispatching integration events immediately'
    );
  });
};

export const dispatchPendingIntegrationEvents = async (
  limit = 10
): Promise<void> => {
  if (dispatchInFlight) {
    return;
  }
  dispatchInFlight = true;
  try {
    const events = await fetchPendingEvents(limit);
    for (const event of events) {
      const webhooks = await findWebhooksForEvent(event.eventType);
      if (webhooks.length === 0) {
        await updateEventStatus(event.id, 'completed');
        continue;
      }
      let allDelivered = true;
      for (const webhook of webhooks) {
        const payload = {
          id: event.id,
          eventType: event.eventType,
          createdAt: event.createdAt,
          data: event.payload
        };
        const body = JSON.stringify(payload);
        const timestamp = new Date().toISOString();
        const signaturePayload = `${timestamp}.${body}`;
        const signature = createHmac('sha256', webhook.secret)
          .update(signaturePayload)
          .digest('hex');
        try {
          const response = await fetch(webhook.targetUrl, {
            method: 'POST',
            headers: {
              'content-type': 'application/json',
              'x-ddms-event': event.eventType,
              'x-ddms-signature': signature,
              'x-ddms-timestamp': timestamp
            },
            body
          });
          const responseBody = await response.text();
          if (response.ok) {
            await recordWebhookDelivery({
              webhookId: webhook.id,
              eventId: event.id,
              status: 'delivered',
              responseCode: response.status,
              responseBody
            });
            await markWebhookSuccess(webhook.id);
          } else {
            allDelivered = false;
            await recordWebhookDelivery({
              webhookId: webhook.id,
              eventId: event.id,
              status: 'failed',
              responseCode: response.status,
              responseBody
            });
            await markWebhookError(webhook.id);
          }
        } catch (error) {
          allDelivered = false;
          await recordWebhookDelivery({
            webhookId: webhook.id,
            eventId: event.id,
            status: 'errored',
            errorMessage: (error as Error).message
          });
          await markWebhookError(webhook.id);
        }
      }
      await updateEventStatus(event.id, allDelivered ? 'completed' : 'pending');
    }
  } finally {
    dispatchInFlight = false;
  }
};
