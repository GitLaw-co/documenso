import { deleteTeam } from '@documenso/lib/server-only/team/delete-team';
import { env } from '@documenso/lib/utils/env';
import { prisma } from '@documenso/prisma';

import { adminTokenProcedure } from '../trpc';
import {
  ZDeleteTeamForPlatformRequestSchema,
  ZDeleteTeamForPlatformResponseSchema,
  deleteTeamForPlatformMeta,
} from './delete-team-for-platform.types';

export const deleteTeamForPlatformRoute = adminTokenProcedure
  .meta(deleteTeamForPlatformMeta)
  .input(ZDeleteTeamForPlatformRequestSchema)
  .output(ZDeleteTeamForPlatformResponseSchema)
  .mutation(async ({ input, ctx }) => {
    ctx.logger.info({ input: { teamId: input.teamId } });

    const orgId = env('DOCUMENSO_ONDEMAND_ORG_ID')!;

    // Scope the team lookup to our org so admin-API cannot accidentally
    // delete teams in other organisations.
    const team = await prisma.team.findFirst({
      where: { id: input.teamId, organisationId: orgId },
    });

    if (!team) {
      return { deleted: false, reason: 'not_found' as const };
    }

    // Accepted trade-off: upstream deleteTeam emits a team-deleted email to
    // every org member. For env-ctl automated teardown this means one email
    // per delete to the platform-admin (the only owner-group member). Cost
    // is low; avoiding it would require modifying the upstream helper and
    // carrying the change through every upstream sync.
    await deleteTeam({
      userId: ctx.user.id,
      teamId: input.teamId,
    });

    return { deleted: true };
  });
