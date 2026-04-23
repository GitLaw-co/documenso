import { deleteWebhookById } from '@documenso/lib/server-only/webhooks/delete-webhook-by-id';
import { env } from '@documenso/lib/utils/env';
import { prisma } from '@documenso/prisma';

import { adminTokenProcedure } from '../trpc';
import {
  ZDeleteWebhookForPlatformRequestSchema,
  ZDeleteWebhookForPlatformResponseSchema,
  deleteWebhookForPlatformMeta,
} from './delete-webhook-for-platform.types';

export const deleteWebhookForPlatformRoute = adminTokenProcedure
  .meta(deleteWebhookForPlatformMeta)
  .input(ZDeleteWebhookForPlatformRequestSchema)
  .output(ZDeleteWebhookForPlatformResponseSchema)
  .mutation(async ({ input, ctx }) => {
    ctx.logger.info({ input: { teamId: input.teamId, webhookId: input.webhookId } });

    const orgId = env('DOCUMENSO_ONDEMAND_ORG_ID')!;

    // Verify the webhook belongs to a team in our org. Pre-check rather than
    // relying on deleteWebhookById's permission model so we return an idempotent
    // noop for absent / cross-org webhooks.
    const webhook = await prisma.webhook.findFirst({
      where: {
        id: input.webhookId,
        teamId: input.teamId,
        team: { organisationId: orgId },
      },
    });
    if (!webhook) {
      return { deleted: false, reason: 'not_found' as const };
    }

    await deleteWebhookById({
      id: input.webhookId,
      userId: ctx.user.id,
      teamId: input.teamId,
    });

    return { deleted: true };
  });
