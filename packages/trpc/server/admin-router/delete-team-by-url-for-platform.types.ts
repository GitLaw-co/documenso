import { z } from 'zod';

import type { TrpcRouteMeta } from '../trpc';

export const deleteTeamByUrlForPlatformMeta: TrpcRouteMeta = {
  openapi: {
    method: 'POST',
    path: '/admin/team/delete-by-url',
    summary:
      'Delete a team by canonical URL in the platform-admin organisation (idempotent, cascades to all team-scoped child resources)',
    tags: ['Admin'],
  },
  adminToken: true,
};

export const ZDeleteTeamByUrlForPlatformRequestSchema = z.object({
  teamUrl: z.string().min(1),
});

export const ZDeleteTeamByUrlForPlatformResponseSchema = z.object({
  deleted: z.boolean(),
  reason: z.literal('not_found').optional(),
});

export type TDeleteTeamByUrlForPlatformRequest = z.infer<
  typeof ZDeleteTeamByUrlForPlatformRequestSchema
>;
export type TDeleteTeamByUrlForPlatformResponse = z.infer<
  typeof ZDeleteTeamByUrlForPlatformResponseSchema
>;
