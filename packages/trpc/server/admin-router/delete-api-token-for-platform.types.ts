import { z } from 'zod';

import type { TrpcRouteMeta } from '../trpc';

export const deleteApiTokenForPlatformMeta: TrpcRouteMeta = {
  openapi: {
    method: 'POST',
    path: '/admin/api-token/delete',
    summary: 'Delete an API token in the platform-admin organisation (idempotent)',
    tags: ['Admin'],
  },
  adminToken: true,
};

export const ZDeleteApiTokenForPlatformRequestSchema = z.object({
  teamId: z.number(),
  tokenId: z.number(),
});

export const ZDeleteApiTokenForPlatformResponseSchema = z.object({
  deleted: z.boolean(),
  reason: z.literal('not_found').optional(),
});

export type TDeleteApiTokenForPlatformRequest = z.infer<
  typeof ZDeleteApiTokenForPlatformRequestSchema
>;
export type TDeleteApiTokenForPlatformResponse = z.infer<
  typeof ZDeleteApiTokenForPlatformResponseSchema
>;
