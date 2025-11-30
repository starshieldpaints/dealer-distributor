import { z } from 'zod';

export const registerWebhookSchema = {
  body: z.object({
    connector: z.string().min(2),
    eventType: z.enum([
      'order.created',
      'order.shipped',
      'order.delivered',
      'order.returned',
      'payment.collected',
      'stock.updated'
    ]),
    targetUrl: z.string().url(),
    secret: z.string().min(16).optional(),
    credentialsRef: z.string().optional()
  })
};

export const listWebhooksSchema = {
  query: z.object({
    eventType: registerWebhookSchema.body.shape.eventType.optional()
  })
};

export const dispatchEventsSchema = {
  body: z
    .object({
      limit: z.number().int().min(1).max(50).optional()
    })
    .partial()
    .default({})
};
