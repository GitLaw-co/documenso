import { ZNameSchema } from '@documenso/lib/types/name';
import { z } from 'zod';

import { ZTeamUrlSchema } from '../team-router/schema';
import type { TrpcRouteMeta } from '../trpc';

export const createTeamForPlatformMeta: TrpcRouteMeta = {
  openapi: {
    method: 'POST',
    path: '/admin/team/create',
    summary: 'Create a team in the platform-admin organisation (idempotent by teamUrl)',
    tags: ['Admin'],
  },
  adminToken: true,
};

export const ZCreateTeamForPlatformRequestSchema = z.object({
  teamUrl: ZTeamUrlSchema,
  teamName: ZNameSchema.optional(),
  inheritMembers: z.boolean().optional(),
});

export const ZAdminTeamSchema = z.object({
  id: z.number(),
  url: z.string(),
  name: z.string(),
  organisationId: z.string(),
  createdAt: z.date(),
});

export const ZCreateTeamForPlatformResponseSchema = z.object({
  team: ZAdminTeamSchema,
  created: z.boolean(),
});

export type TCreateTeamForPlatformRequest = z.infer<typeof ZCreateTeamForPlatformRequestSchema>;
export type TCreateTeamForPlatformResponse = z.infer<typeof ZCreateTeamForPlatformResponseSchema>;
