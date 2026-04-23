import { TRPCError } from '@trpc/server';

import { createApiToken } from '@documenso/lib/server-only/public-api/create-api-token';
import { env } from '@documenso/lib/utils/env';
import { prisma } from '@documenso/prisma';

import { adminTokenProcedure } from '../trpc';
import {
  ZCreateApiTokenForPlatformRequestSchema,
  ZCreateApiTokenForPlatformResponseSchema,
  createApiTokenForPlatformMeta,
} from './create-api-token-for-platform.types';

export const createApiTokenForPlatformRoute = adminTokenProcedure
  .meta(createApiTokenForPlatformMeta)
  .input(ZCreateApiTokenForPlatformRequestSchema)
  .output(ZCreateApiTokenForPlatformResponseSchema)
  .mutation(async ({ input, ctx }) => {
    ctx.logger.info({
      input: { teamId: input.teamId, tokenName: input.tokenName },
    });

    const orgId = env('DOCUMENSO_ONDEMAND_ORG_ID')!;

    // Pre-verify team belongs to our org so token creates can't slip
    // across orgs.
    const team = await prisma.team.findFirst({
      where: { id: input.teamId, organisationId: orgId },
    });
    if (!team) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Team not found in the platform-admin organisation.',
      });
    }

    // Idempotency: match by (teamId, name). Scope confirmed above.
    const existing = await prisma.apiToken.findFirst({
      where: { teamId: input.teamId, name: input.tokenName },
    });
    if (existing) {
      return {
        token: {
          id: existing.id,
          name: existing.name,
          createdAt: existing.createdAt,
        },
        created: false,
        plaintextAvailable: false,
      };
    }

    const { id, token: plaintext } = await createApiToken({
      userId: ctx.user.id,
      teamId: input.teamId,
      tokenName: input.tokenName,
      expiresIn: null,
    });

    // Re-read to surface createdAt (createApiToken returns only id +
    // plaintext).
    const created = await prisma.apiToken.findUniqueOrThrow({
      where: { id },
    });

    return {
      token: {
        id: created.id,
        name: created.name,
        createdAt: created.createdAt,
      },
      plaintext,
      created: true,
      plaintextAvailable: true,
    };
  });
