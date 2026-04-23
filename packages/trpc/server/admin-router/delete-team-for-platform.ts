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

    await deleteTeam({
      userId: ctx.user.id,
      teamId: input.teamId,
      skipNotifications: true,
    });

    return { deleted: true };
  });
