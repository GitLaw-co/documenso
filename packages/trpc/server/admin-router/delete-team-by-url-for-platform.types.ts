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

// Normalize on input: trim + lowercase to match the `Team.url` storage form
// produced by `ZTeamUrlSchema` on team creation. Keeps the lookup robust
// against a future caller that capitalizes a slug or adds whitespace, even
// though the current sole caller (env-cli) always sends `env-<slug>` already
// in canonical form. Skip the format/regex/PROTECTED_TEAM_URLS checks from
// `ZTeamUrlSchema` — none of them are appropriate for a delete-side input.
export const ZDeleteTeamByUrlForPlatformRequestSchema = z.object({
  teamUrl: z.string().trim().toLowerCase().min(1),
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
