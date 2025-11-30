import { Router } from 'express';
import { authorize } from '../../middleware/authorize';
import { validateRequest } from '../../middleware/validateRequest';
import { asyncHandler } from '../../utils/asyncHandler';
import {
  dispatchPendingIntegrationEvents,
  listRegisteredWebhooks,
  registerWebhookEndpoint
} from './integration.service';
import {
  dispatchEventsSchema,
  listWebhooksSchema,
  registerWebhookSchema
} from './integration.schemas';
import { requirePermission } from '../../middleware/permissions';

export const integrationsRouter = Router();

integrationsRouter.post(
  '/webhooks',
  authorize('admin'),
  requirePermission('integrations:write'),
  validateRequest(registerWebhookSchema),
  asyncHandler(async (req, res) => {
    const webhook = await registerWebhookEndpoint(req.body, req.user);
    res.status(201).json({ data: webhook });
  })
);

integrationsRouter.get(
  '/webhooks',
  authorize('admin'),
  requirePermission('integrations:read'),
  validateRequest(listWebhooksSchema),
  asyncHandler(async (req, res) => {
    const { eventType } = req.query as Record<string, string>;
    const webhooks = await listRegisteredWebhooks(eventType, req.user);
    res.json({ data: webhooks });
  })
);

integrationsRouter.post(
  '/events/dispatch',
  authorize('admin'),
  requirePermission('integrations:write'),
  validateRequest(dispatchEventsSchema),
  asyncHandler(async (req, res) => {
    const limit = req.body?.limit ?? 10;
    await dispatchPendingIntegrationEvents(limit);
    res.status(202).json({ message: 'Dispatch triggered' });
  })
);
