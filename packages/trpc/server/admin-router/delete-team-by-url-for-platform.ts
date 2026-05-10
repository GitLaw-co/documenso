import { deleteTeam } from '@documenso/lib/server-only/team/delete-team';
import { env } from '@documenso/lib/utils/env';
import { prisma } from '@documenso/prisma';

import { adminTokenProcedure } from '../trpc';
import {
  ZDeleteTeamByUrlForPlatformRequestSchema,
  ZDeleteTeamByUrlForPlatformResponseSchema,
  deleteTeamByUrlForPlatformMeta,
} from './delete-team-by-url-for-platform.types';

export const deleteTeamByUrlForPlatformRoute = adminTokenProcedure
  .meta(deleteTeamByUrlForPlatformMeta)
  .input(ZDeleteTeamByUrlForPlatformRequestSchema)
  .output(ZDeleteTeamByUrlForPlatformResponseSchema)
  .mutation(async ({ input, ctx }) => {
    ctx.logger.info({ input: { teamUrl: input.teamUrl } });

    const orgId = env('DOCUMENSO_ONDEMAND_ORG_ID')!;

    // Defensive auth invariant — admin-API only acts inside its own org.
    // Note: Team.url is globally @unique (schema.prisma:912), so cross-org
    // collisions are schema-prevented. The org filter is hardening, not
    // a correctness requirement.
    const team = await prisma.team.findFirst({
      where: { url: input.teamUrl, organisationId: orgId },
    });

    if (!team) {
      return { deleted: false, reason: 'not_found' as const };
    }

    // Delegate to the existing helper. It handles:
    //   - prisma.team.delete (cascades ApiToken, Webhook, TeamProfile,
    //     TeamEmail, TeamEmailVerification, TeamGroup, Folder, Envelope
    //     and indirect envelope children via Prisma onDelete: Cascade).
    //   - TeamGlobalSettings cleanup (added in PR-A Task 1).
    //   - empty internal OrganisationGroup purge.
    //   - team-deleted email job dispatch (accepted side effect, see
    //     README-admin-api.md).
    //
    // Auth invariant: deleteTeam's buildTeamWhereQuery requires the user
    // to have DELETE_TEAM role on the team via team-group membership.
    // For env-* teams this holds because create-team-for-platform
    // propagates the platform org's ADMIN group onto every new team
    // (see packages/lib/server-only/team/create-team.ts:107-165 and
    // README-admin-api.md §97). If create-team is ever changed to skip
    // ADMIN-group inheritance for platform-admin teams, this endpoint
    // will silently break with a misleading UNAUTHORIZED — keep the
    // invariant intact.
    await deleteTeam({
      userId: ctx.user.id,
      teamId: team.id,
    });

    return { deleted: true };
  });
