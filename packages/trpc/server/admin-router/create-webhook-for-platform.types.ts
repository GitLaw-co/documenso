import { WebhookTriggerEvents } from '@prisma/client';
import { z } from 'zod';

import type { TrpcRouteMeta } from '../trpc';
import { ZCreateWebhookRequestSchema } from '../webhook-router/schema';

export const createWebhookForPlatformMeta: TrpcRouteMeta = {
  openapi: {
    method: 'POST',
    path: '/admin/webhook/create',
    summary: 'Create a webhook for a team in the platform-admin organisation (idempotent by URL)',
    tags: ['Admin'],
  },
  adminToken: true,
};

export const ZCreateWebhookForPlatformRequestSchema = ZCreateWebhookRequestSchema.extend({
  teamId: z.number(),
  secret: z.string().min(16),
});

export const ZAdminWebhookSchema = z.object({
  id: z.string(),
  webhookUrl: z.string(),
  eventTriggers: z.array(z.nativeEnum(WebhookTriggerEvents)),
  enabled: z.boolean(),
  createdAt: z.date(),
});

export const ZCreateWebhookForPlatformResponseSchema = z.object({
  webhook: ZAdminWebhookSchema,
  created: z.boolean(),
});

export type TCreateWebhookForPlatformRequest = z.infer<
  typeof ZCreateWebhookForPlatformRequestSchema
>;
export type TCreateWebhookForPlatformResponse = z.infer<
  typeof ZCreateWebhookForPlatformResponseSchema
>;
