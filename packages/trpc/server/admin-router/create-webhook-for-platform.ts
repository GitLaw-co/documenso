import { TRPCError } from '@trpc/server';

import { createWebhook } from '@documenso/lib/server-only/webhooks/create-webhook';
import { env } from '@documenso/lib/utils/env';
import { prisma } from '@documenso/prisma';

import { adminTokenProcedure } from '../trpc';
import {
  ZCreateWebhookForPlatformRequestSchema,
  ZCreateWebhookForPlatformResponseSchema,
  createWebhookForPlatformMeta,
} from './create-webhook-for-platform.types';

export const createWebhookForPlatformRoute = adminTokenProcedure
  .meta(createWebhookForPlatformMeta)
  .input(ZCreateWebhookForPlatformRequestSchema)
  .output(ZCreateWebhookForPlatformResponseSchema)
  .mutation(async ({ input, ctx }) => {
    ctx.logger.info({
      input: { teamId: input.teamId, webhookUrl: input.webhookUrl },
    });

    const orgId = env('DOCUMENSO_ONDEMAND_ORG_ID')!;

    // Pre-verify team belongs to our org.
    const team = await prisma.team.findFirst({
      where: { id: input.teamId, organisationId: orgId },
    });
    if (!team) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Team not found in the platform-admin organisation.',
      });
    }

    // Idempotency by (teamId, webhookUrl). On replay we return the existing
    // record but NOT the secret — the caller should already have it (they
    // supplied it on first create), and the stored hash is not reversible.
    const existing = await prisma.webhook.findFirst({
      where: { teamId: input.teamId, webhookUrl: input.webhookUrl },
    });
    if (existing) {
      return { webhook: existing, created: false };
    }

    const webhook = await createWebhook({
      userId: ctx.user.id,
      teamId: input.teamId,
      webhookUrl: input.webhookUrl,
      secret: input.secret,
      eventTriggers: input.eventTriggers,
      enabled: input.enabled,
    });

    return { webhook, created: true };
  });
