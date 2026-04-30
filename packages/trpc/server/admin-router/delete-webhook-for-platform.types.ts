import { z } from 'zod';

import type { TrpcRouteMeta } from '../trpc';

export const deleteWebhookForPlatformMeta: TrpcRouteMeta = {
  openapi: {
    method: 'POST',
    path: '/admin/webhook/delete',
    summary: 'Delete a webhook in the platform-admin organisation (idempotent)',
    tags: ['Admin'],
  },
  adminToken: true,
};

export const ZDeleteWebhookForPlatformRequestSchema = z.object({
  teamId: z.number(),
  webhookId: z.string(),
});

export const ZDeleteWebhookForPlatformResponseSchema = z.object({
  deleted: z.boolean(),
  reason: z.literal('not_found').optional(),
});

export type TDeleteWebhookForPlatformRequest = z.infer<
  typeof ZDeleteWebhookForPlatformRequestSchema
>;
export type TDeleteWebhookForPlatformResponse = z.infer<
  typeof ZDeleteWebhookForPlatformResponseSchema
>;
