import { deleteTokenById } from '@documenso/lib/server-only/public-api/delete-api-token-by-id';
import { env } from '@documenso/lib/utils/env';
import { prisma } from '@documenso/prisma';

import { adminTokenProcedure } from '../trpc';
import {
  ZDeleteApiTokenForPlatformRequestSchema,
  ZDeleteApiTokenForPlatformResponseSchema,
  deleteApiTokenForPlatformMeta,
} from './delete-api-token-for-platform.types';

export const deleteApiTokenForPlatformRoute = adminTokenProcedure
  .meta(deleteApiTokenForPlatformMeta)
  .input(ZDeleteApiTokenForPlatformRequestSchema)
  .output(ZDeleteApiTokenForPlatformResponseSchema)
  .mutation(async ({ input, ctx }) => {
    ctx.logger.info({ input: { teamId: input.teamId, tokenId: input.tokenId } });

    const orgId = env('DOCUMENSO_ONDEMAND_ORG_ID')!;

    // Verify the token belongs to a team in our org. We pre-check rather
    // than relying on deleteTokenById's permission model so we return an
    // idempotent noop (not a generic error) for tokens that don't exist
    // or belong to other orgs.
    const token = await prisma.apiToken.findFirst({
      where: {
        id: input.tokenId,
        teamId: input.teamId,
        team: { organisationId: orgId },
      },
    });
    if (!token) {
      return { deleted: false, reason: 'not_found' as const };
    }

    await deleteTokenById({
      id: input.tokenId,
      userId: ctx.user.id,
      teamId: input.teamId,
    });

    return { deleted: true };
  });
