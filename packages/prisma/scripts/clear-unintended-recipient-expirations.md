# Runbook: clear unintended recipient expirations (GHT-5149)

Production runbook for the data cleanup that accompanies the
[`clear-unintended-recipient-expirations.ts`](./clear-unintended-recipient-expirations.ts)
script.

> **Eagle Bot has no production cluster access (staging only).** A human/ops
> engineer with prod access must run this.

## Goal

Documenso silently applied a 3-month expiry to documents created via the v1 API
(the old `resolveExpiresAt(null)` default). Expiry **hard-blocks signing** —
`assertRecipientNotExpired` throws `RECIPIENT_EXPIRED` on sign / complete /
reject — so in-flight documents stop progressing and counterparties get locked
out. This cleanup clears `expiresAt` and `expirationNotifiedAt` on the affected
recipients to stop the expiry and unblock anyone already locked out.

The code change in PR #118 stops **new** documents from acquiring expiry; this
cleanup only fixes **existing** rows.

## Scope of affected rows

Exactly the rows matched by the script's `where` clause:

```text
Recipient.expiresAt IS NOT NULL
  AND Recipient.signingStatus NOT IN ('SIGNED', 'REJECTED')
  AND parent Envelope.status = 'PENDING'
```

Apply sets `expiresAt = NULL` and `expirationNotifiedAt = NULL` on those rows.

## Staging validation (already done)

A read-only dry-run Job (Option B below) against the `stg` Documenso DB returned:

```json
{ "targetToClear": 29, "alreadyLocked": 1, "anyWithExpiry": 31 }
```

- `targetToClear` — rows in scope (will be cleared on apply).
- `alreadyLocked` — subset already past `expiresAt` (counterparties currently locked out).
- `anyWithExpiry` — all recipients with any `expiresAt` (sanity bound).

DB connection and query were verified end-to-end on staging.

## Preconditions

1. **Deploy this PR (#118) to prod first.** `resolveExpiresAt` must already be
   live so new documents stop acquiring expiry — the cleanup only fixes existing
   rows.
2. **Confirm prod specifics that may differ from staging:**
   - the Documenso deployment **namespace**;
   - the DB secret **name/key** and **env var** (staging used secret
     `documenso-secrets`, key `database-url`, env var `NEXT_PRIVATE_DATABASE_URL`);
   - the current prod **image tag**.
3. **Take a DB snapshot before applying.** Clearing the timestamps is not
   reversible from the app. This is acceptable (disabling expiry is the intent),
   but snapshot for safety.

## Execution — Option A (canonical: the reviewed script)

From a repo checkout with network access to the prod DB and the prod connection
string exported:

```bash
export NEXT_PRIVATE_DATABASE_URL='postgres://USER:PASS@PROD_HOST:5432/DBNAME'

# 1) Dry-run (default) — prints the count, mutates nothing.
npm --workspace @documenso/prisma run script:clear-recipient-expirations

# 2) Review the count and take a DB snapshot, then apply.
npm --workspace @documenso/prisma run script:clear-recipient-expirations -- --apply
```

`APPLY=true` is equivalent to `--apply`.

## Execution — Option B (self-contained k8s Job, no source/tsx needed)

Runs against the deployed Documenso image, so it needs no repo checkout — it
uses the image's bundled `@prisma/client`. This is the exact pattern validated
on staging.

1. Save the skeleton below as `clear-recipient-expirations.job.yaml` and fill in
   the `<DOCUMENSO_NAMESPACE>` and `<DOCUMENSO_IMAGE>` placeholders (and adjust
   the `secretKeyRef` if prod differs from staging).
2. Apply it and read the logs (dry-run prints the counts, mutates nothing):

   ```bash
   kubectl apply -f clear-recipient-expirations.job.yaml
   kubectl -n <DOCUMENSO_NAMESPACE> logs -f job/clear-recipient-expirations-dryrun
   ```

3. Review the counts and take a DB snapshot.
4. To apply, swap the `args` script for the **apply** snippet below, rename the
   Job (e.g. `-apply`), and re-apply. Read the logs for `{"cleared": N}`.

### Job skeleton — dry-run

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: clear-recipient-expirations-dryrun
  namespace: <DOCUMENSO_NAMESPACE> # prod Documenso namespace
spec:
  ttlSecondsAfterFinished: 600
  backoffLimit: 0
  template:
    spec:
      restartPolicy: Never
      containers:
        - name: clear-recipient-expirations
          image: <DOCUMENSO_IMAGE> # current prod Documenso image tag
          command: ['node']
          args:
            - -e
            - |
              const { PrismaClient } = require('@prisma/client');
              const prisma = new PrismaClient();
              const scope = {
                expiresAt: { not: null },
                signingStatus: { notIn: ['SIGNED', 'REJECTED'] },
                envelope: { status: 'PENDING' },
              };
              (async () => {
                const targetToClear = await prisma.recipient.count({ where: scope });
                const alreadyLocked = await prisma.recipient.count({
                  where: { ...scope, expiresAt: { lte: new Date() } },
                });
                const anyWithExpiry = await prisma.recipient.count({
                  where: { expiresAt: { not: null } },
                });
                console.log(JSON.stringify({ targetToClear, alreadyLocked, anyWithExpiry }));
                await prisma.$disconnect();
              })();
          env:
            - name: NEXT_PRIVATE_DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: documenso-secrets
                  key: database-url
```

### Apply snippet (swap into `args` after review + backup)

```yaml
- |
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();
  (async () => {
    const res = await prisma.recipient.updateMany({
      where: {
        expiresAt: { not: null },
        signingStatus: { notIn: ['SIGNED', 'REJECTED'] },
        envelope: { status: 'PENDING' },
      },
      data: { expiresAt: null, expirationNotifiedAt: null },
    });
    console.log(JSON.stringify({ cleared: res.count }));
    await prisma.$disconnect();
  })();
```

## Verify

Re-run the dry-run (Option A script, or the Option B dry-run Job). Expect
`targetToClear=0` — no remaining in-scope rows.
