import { createTeamForPlatform } from '@documenso/lib/server-only/team/create-team-for-platform';
import { env } from '@documenso/lib/utils/env';
import { prisma } from '@documenso/prisma';

import { adminTokenProcedure } from '../trpc';
import {
  ZCreateTeamForPlatformRequestSchema,
  ZCreateTeamForPlatformResponseSchema,
  createTeamForPlatformMeta,
} from './create-team-for-platform.types';

export const createTeamForPlatformRoute = adminTokenProcedure
  .meta(createTeamForPlatformMeta)
  .input(ZCreateTeamForPlatformRequestSchema)
  .output(ZCreateTeamForPlatformResponseSchema)
  .mutation(async ({ input, ctx }) => {
    ctx.logger.info({ input: { teamUrl: input.teamUrl } });

    const orgId = env('DOCUMENSO_ONDEMAND_ORG_ID')!;

    const existing = await prisma.team.findFirst({
      where: { url: input.teamUrl, organisationId: orgId },
    });

    if (existing) {
      return { team: existing, created: false };
    }

    const team = await createTeamForPlatform({
      userId: ctx.user.id,
      teamName: input.teamName ?? input.teamUrl,
      teamUrl: input.teamUrl,
      organisationId: orgId,
      inheritMembers: input.inheritMembers ?? false,
    });

    return { team, created: true };
  });
