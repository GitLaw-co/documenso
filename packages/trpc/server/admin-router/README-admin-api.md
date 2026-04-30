# Admin API (platform automation)

HTTP surface at `/api/v2/admin/*` for automated platform operations (primary consumer: an external on-demand-environments orchestrator). Authenticates via a single static bearer token (`DOCUMENSO_ADMIN_API_KEY`) and impersonates the owner of a fixed Organisation identified by `DOCUMENSO_ONDEMAND_ORG_ID`.

This is a fork-only surface — not present in upstream Documenso. See `FORK-DELTAS.md` at the repo root for the full inventory of fork modifications.

---

## 1. Endpoints

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/api/v2/admin/team/create` | Create team (idempotent by `teamUrl`) |
| POST | `/api/v2/admin/team/delete` | Delete team (idempotent, noop on not-found) |
| POST | `/api/v2/admin/api-token/create` | Issue API token for a team (idempotent by `tokenName`; plaintext returned ONCE) |
| POST | `/api/v2/admin/api-token/delete` | Revoke API token |
| POST | `/api/v2/admin/webhook/create` | Register webhook (idempotent by `webhookUrl`) |
| POST | `/api/v2/admin/webhook/delete` | Remove webhook |

All requests: `Authorization: Bearer $DOCUMENSO_ADMIN_API_KEY`, `Content-Type: application/json`. Responses: tRPC-standard JSON.

**Idempotency scope.** The create endpoints are idempotent under sequential single-caller usage (the orchestrator's real access pattern, backed by its own external locking). True concurrent duplicate requests with the same idempotency key are NOT guaranteed idempotent at the Documenso layer — two simultaneous `team/create` calls with the same `teamUrl` may yield one 200 + one 400 `ALREADY_EXISTS`; two simultaneous `webhook/create` or `api-token/create` calls with the same name/URL may silently produce duplicate rows. Upstream schemas lack DB-level uniqueness on these idempotency keys. Callers that need concurrency safety must serialize at their own layer.

---

## 2. Bootstrap (one-time per Documenso instance)

Generic outline. Operator-specific details (hostnames, k8s namespace, secret store, post-deploy smoke procedure) live in the operator's internal runbook.

1. Sign up the platform-admin user via the standard Documenso signup flow at `<your-documenso-host>/signup`. Use a dedicated automation email address that no human will use interactively (e.g. `<platform-admin-email>`).

2. Mark the user's email verified and grant ADMIN role. In production, complete email verification through the standard email-link flow; in staging or self-hosted dev, an operator may run an equivalent SQL update directly against the Documenso database. Generic shape:

   ```sql
   UPDATE "User"
   SET "emailVerified" = NOW(),
       roles = ARRAY['USER', 'ADMIN']::"Role"[]
   WHERE email = '<platform-admin-email>';
   ```

3. Log in as platform-admin, create the parent Organisation via the Documenso UI. The platform-admin user automatically becomes the owner. Choose any unique Organisation name; the admin API does not depend on it semantically.

4. Capture the Organisation ID from the database:

   ```sql
   SELECT id FROM "Organisation" WHERE name = '<your-org-name>';
   ```

   Format: `org_<16 chars>`.

5. Generate the admin key:

   ```bash
   openssl rand -base64 32
   ```

   Store it in your secret manager (cloud KMS, Kubernetes SealedSecret, Vault, 1Password, etc.).

6. Inject the following environment variables into the Documenso pod / process:

   - `DOCUMENSO_ADMIN_API_KEY=<generated key>` — secret; load from your secret manager.
   - `DOCUMENSO_ONDEMAND_ORG_ID=<org_xxx>` — non-secret; can live in plain config.

7. Provide the same `DOCUMENSO_ADMIN_API_KEY` to the orchestrator's secret store.

8. Smoke test (replace `<documenso-host>` and `<admin-key>` with your values):

   ```bash
   curl -fsS -X POST https://<documenso-host>/api/v2/admin/team/create \
     -H "Authorization: Bearer <admin-key>" \
     -H "Content-Type: application/json" \
     -d '{"teamUrl":"smoke-test"}'
   # Expect HTTP 200 with {"team":{...},"created":true}
   # Repeat same call → {"created":false}
   # Delete:
   curl -fsS -X POST https://<documenso-host>/api/v2/admin/team/delete \
     -H "Authorization: Bearer <admin-key>" \
     -H "Content-Type: application/json" \
     -d '{"teamId":<id>}'
   ```

**Production note:** the SQL shortcut for email verification is appropriate only in staging or self-hosted dev. In production, complete email verification through the standard email-link flow. Role promotion can still be performed via SQL if necessary, but should go through the admin UI when possible.

---

## 3. Operational invariants

- The platform-admin user **must not** be used interactively via the Documenso UI except for the one-time bootstrap above. Admin-API actions are attributed to this user in audit logs; if a human also uses the account via UI, audit attribution becomes ambiguous.
- The user is flagged with ADMIN role to allow inspection via the Documenso admin panel (for debugging only, not for routine operations).
- The orchestrator is the only legitimate caller of the admin API in automated flows. Other callers should be reviewed for fit.
- **`admin.team.deleteForPlatform` triggers the upstream team-deleted email** to every member of the parent Organisation's ADMIN group on every automated teardown. This is an accepted trade-off: suppressing the email would require modifying the upstream `deleteTeam` helper, which would cost a merge conflict on every upstream sync touching the team module. Expect approximately one email per env teardown; filter or auto-archive on the receiver side if the volume becomes noisy.

---

## 4. Identity & permissions model

Admin API requests impersonate the Organisation owner identified by `DOCUMENSO_ONDEMAND_ORG_ID`. The owner is a member of the `ADMIN` organisation group, which grants `TeamMemberRole.ADMIN` on every team in the organisation. All per-team permission checks (`MANAGE_TEAM`, `DELETE_TEAM`, etc.) are satisfied by this role — no bypass flags in `packages/lib/server-only/*` helpers.

---

## 5. Observability

Each admin API request emits a structured pino log line with `auth: 'apiAdminToken'`, `userId: <owner id>`, `organisationId: <org id>`, `path: <procedure path>`. Operator-side log-based metrics and alert policies are out of scope for this fork.

A post-deploy smoke-test that runs the admin API create→delete sequence against a throwaway slug on every Documenso deploy is recommended; the operator owns its implementation.

---

## 6. Rotation

No automation. If the admin key is ever compromised:

1. Generate a new value: `openssl rand -base64 32`.
2. Update the secret in your secret manager (`DOCUMENSO_ADMIN_API_KEY` → new value).
3. Roll the Documenso deployment so the new env var is loaded.
4. Brief 401 window for the orchestrator until its secret is updated and it retries; the orchestrator's retry budget should absorb this.
5. Update the orchestrator's secret store with the new key.

The fork does not impose a scheduled rotation policy; operators decide based on their threat model.

---

## 7. Rate limiting

Admin endpoints have a dedicated bucket at 300 req/min (IP-keyed), separate from the general `/api/v2/*` bucket (100 req/min). Mounted in `apps/remix/server/router.ts`. The orchestrator's expected burst profile (a small number of calls per env operation) fits comfortably.

---

## 8. OpenAPI visibility

Admin paths are filtered out of the public `/api/v2/openapi.json` document. Future readers with out-of-band knowledge of this surface can construct calls from this README. The filter is in `packages/trpc/server/open-api-public.ts` — it wraps the upstream-generated document from `open-api.ts` rather than modifying it (`FORK-DELTAS.md` has the rationale).

---

## 9. Error codes

| Code | Meaning |
| --- | --- |
| `401 Unauthorized` | Missing or invalid admin key. |
| `403 Forbidden` | Owner account disabled. |
| `404 Not Found` | Team not in the parent organisation (for token/webhook create); organisation misconfigured. |
| `500 Internal Server Error` | Configuration issue (`DOCUMENSO_ONDEMAND_ORG_ID` unset / invalid, etc.). |

Idempotent-delete noop returns `200` with `{deleted: false, reason: 'not_found'}`, NOT 404.
