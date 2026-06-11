/**
 * One-off data-cleanup: clear the unintended eSign auto-expiry from existing documents.
 *
 * GHT-5149. Every GitLaw document was created via the Documenso v1 API without an
 * expiration period. Until this PR, `resolveExpiresAt(null)` defaulted to a 3-month
 * period, so historical documents had `expiresAt` baked onto their recipients. Those
 * recipients keep expiring and — because `assertRecipientNotExpired` hard-blocks
 * signing — lock real signers out of pending documents.
 *
 * The code fix stops NEW documents from expiring. This script removes the expiry that
 * was already written to existing PENDING documents so in-flight signers are unblocked.
 *
 * Target rows (the dry-run query): `Recipient` rows where
 *   - `expiresAt IS NOT NULL`
 *   - `signingStatus NOT IN ('SIGNED', 'REJECTED')`
 *   - the parent `Envelope.status = 'PENDING'`
 * Apply mode sets `expiresAt = NULL` and `expirationNotifiedAt = NULL` on exactly those rows.
 *
 * SAFETY:
 *   - Dry-run is the DEFAULT. It only reports counts and mutates nothing.
 *   - Mutation requires an explicit `--apply` flag (or `APPLY=true`).
 *   - This must be run DELIBERATELY and only after taking a database backup.
 *
 * Usage (run against the Documenso database, with DATABASE_URL set):
 *   # Dry-run (safe, default):
 *   tsx ./scripts/clear-unintended-recipient-expirations.ts
 *   # Apply (mutates rows):
 *   tsx ./scripts/clear-unintended-recipient-expirations.ts --apply
 */
import { DocumentStatus, type Prisma, SigningStatus } from '@prisma/client';

import { prisma } from '..';

const isApplyMode = process.argv.includes('--apply') || process.env.APPLY === 'true';

// The exact set of rows this cleanup targets. Used for both the dry-run count and the apply step.
const targetRecipientsWhere: Prisma.RecipientWhereInput = {
  expiresAt: { not: null },
  signingStatus: { notIn: [SigningStatus.SIGNED, SigningStatus.REJECTED] },
  envelope: { status: DocumentStatus.PENDING },
};

const clearUnintendedRecipientExpirations = async () => {
  const affected = await prisma.recipient.findMany({
    where: targetRecipientsWhere,
    select: { id: true },
  });

  console.log(`[expiry-cleanup] Mode: ${isApplyMode ? 'APPLY' : 'DRY-RUN'}`);
  console.log(
    `[expiry-cleanup] Recipients with auto-expiry on PENDING documents (unsigned/unrejected): ${affected.length}`,
  );

  if (affected.length === 0) {
    console.log('[expiry-cleanup] Nothing to clear.');

    return;
  }

  if (!isApplyMode) {
    console.log(
      '[expiry-cleanup] Dry-run only. Re-run with --apply to clear expiresAt/expirationNotifiedAt.',
    );

    return;
  }

  const result = await prisma.recipient.updateMany({
    where: { id: { in: affected.map((recipient) => recipient.id) } },
    data: {
      expiresAt: null,
      expirationNotifiedAt: null,
    },
  });

  console.log(`[expiry-cleanup] Cleared expiry on ${result.count} recipient(s).`);
};

clearUnintendedRecipientExpirations()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
