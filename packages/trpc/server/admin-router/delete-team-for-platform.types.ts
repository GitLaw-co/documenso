import { z } from 'zod';

import type { TrpcRouteMeta } from '../trpc';

export const deleteTeamForPlatformMeta: TrpcRouteMeta = {
  openapi: {
    method: 'POST',
    path: '/admin/team/delete',
    summary: 'Delete a team in the platform-admin organisation (idempotent)',
    tags: ['Admin'],
  },
  adminToken: true,
};

export const ZDeleteTeamForPlatformRequestSchema = z.object({
  teamId: z.number(),
});

export const ZDeleteTeamForPlatformResponseSchema = z.object({
  deleted: z.boolean(),
  reason: z.literal('not_found').optional(),
});

export type TDeleteTeamForPlatformRequest = z.infer<typeof ZDeleteTeamForPlatformRequestSchema>;
export type TDeleteTeamForPlatformResponse = z.infer<typeof ZDeleteTeamForPlatformResponseSchema>;
