import { z } from 'zod';

import type { TrpcRouteMeta } from '../trpc';

export const createApiTokenForPlatformMeta: TrpcRouteMeta = {
  openapi: {
    method: 'POST',
    path: '/admin/api-token/create',
    summary:
      'Issue an API token for a team in the platform-admin organisation ' + '(idempotent by name)',
    tags: ['Admin'],
  },
  adminToken: true,
};

export const ZCreateApiTokenForPlatformRequestSchema = z.object({
  teamId: z.number(),
  tokenName: z.string().min(3, {
    message: 'The token name should be 3 characters or longer',
  }),
});

export const ZAdminApiTokenSchema = z.object({
  id: z.number(),
  name: z.string(),
  createdAt: z.date(),
});

export const ZCreateApiTokenForPlatformResponseSchema = z.object({
  token: ZAdminApiTokenSchema,
  plaintext: z.string().optional(),
  created: z.boolean(),
  plaintextAvailable: z.boolean(),
});

export type TCreateApiTokenForPlatformRequest = z.infer<
  typeof ZCreateApiTokenForPlatformRequestSchema
>;
export type TCreateApiTokenForPlatformResponse = z.infer<
  typeof ZCreateApiTokenForPlatformResponseSchema
>;
