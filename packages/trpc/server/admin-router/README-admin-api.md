# Admin API (platform automation)

HTTP surface at `/api/v2/admin/*` for automated platform operations (primary consumer: `env-ctl`, the on-demand-environments orchestrator). Authenticates via a single static bearer token (`DOCUMENSO_ADMIN_API_KEY`) and impersonates the owner of a fixed Organisation identified by `DOCUMENSO_ONDEMAND_ORG_ID`.

This is a fork-only surface — not present in upstream Documenso. See the full design rationale and rejected alternatives in the GitLaw on-demand-envs working directory (external reference).

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

---

## 2. Bootstrap (one-time per Documenso instance)

The steps below are **stg-specific**. Production has a compliance variation noted at the end.

1. Sign up the platform-admin user at `https://esign.stg.gitlaw.co/signup` with email `platform-admin@git.law`.

2. **Stg-only shortcut** — mark email verified + promote to ADMIN role via SQL:
   ```bash
   kubectl -n stg exec stg-postgresql-0 -- bash -c "PGPASSWORD=gitea psql -U gitea -d documenso -c \"UPDATE \\\"User\\\" SET \\\"emailVerified\\\" = NOW(), roles = ARRAY['USER', 'ADMIN']::\\\"Role\\\"[] WHERE email = 'platform-admin@git.law';\""
   ```

3. Log in as platform-admin, create the `on-demand-envs` Organisation via the Documenso UI. The platform-admin user automatically becomes owner.

4. Capture the Organisation ID:
   ```bash
   kubectl -n stg exec stg-postgresql-0 -- bash -c "PGPASSWORD=gitea psql -U gitea -d documenso -c \"SELECT id FROM \\\"Organisation\\\" WHERE name = 'on-demand-envs';\""
   ```
   Format: `org_<16 chars>`.

5. Generate the admin key: `openssl rand -base64 32`. Store it somewhere secret (1Password or the deployer's secret store) — it will be added to the `documenso-secrets` SealedSecret.

6. Add to the Documenso pod env (via SealedSecret + Helm values):
   - `DOCUMENSO_ADMIN_API_KEY=<key>` (in `documenso-secrets` SealedSecret, not plain values)
   - `DOCUMENSO_ONDEMAND_ORG_ID=<org_xxx>` (non-secret; plain `values-documenso.yaml` or SealedSecret — deployer's choice)

7. Store the same `DOCUMENSO_ADMIN_API_KEY` in env-ctl's secret store (out of scope here; see env-ctl bootstrap docs).

8. Smoke test:
   ```bash
   KEY=<admin-key>
   curl -fsS -X POST https://esign.stg.gitlaw.co/api/v2/admin/team/create \
     -H "Authorization: Bearer $KEY" -H "Content-Type: application/json" \
     -d '{"teamUrl":"smoke-test"}'
   # Expect HTTP 200 with {"team":{...},"created":true}
   # Repeat same call → {"created":false}
   # Delete:
   curl -fsS -X POST https://esign.stg.gitlaw.co/api/v2/admin/team/delete \
     -H "Authorization: Bearer $KEY" -H "Content-Type: application/json" \
     -d "{\"teamId\":<id>}"
   ```

**Production bootstrap difference:** step 2's email-verified shortcut is NOT permitted in prod — the user must verify via real email. Role promotion can still be done via SQL if needed, but should be via admin UI if possible.

---

## 3. Operational invariants

- **`platform-admin@git.law` must NOT be used interactively via the Documenso UI** except for the one-time bootstrap above. Admin-API actions are attributed to this user in audit logs; if a human also uses the account via UI, audit attribution becomes ambiguous.
- The user is flagged with ADMIN role to allow inspection via the Documenso admin panel (for debugging only, not for routine operations).
- `env-ctl` is the only legitimate caller of the admin API in automated flows. Other callers should be reviewed for fit.

---

## 4. Identity & permissions model

Admin API requests impersonate the Organisation owner identified by `DOCUMENSO_ONDEMAND_ORG_ID`. The owner is a member of the `ADMIN` organisation group, which grants `TeamMemberRole.ADMIN` on every team in the organisation. All per-team permission checks (`MANAGE_TEAM`, `DELETE_TEAM`, etc.) are satisfied by this role — no bypass flags in `packages/lib/server-only/*` helpers.

---

## 5. Observability

Each admin API request emits a structured pino log line with `auth: 'apiAdminToken'`, `userId: <owner id>`, `organisationId: <org id>`, `path: <procedure path>`. Stackdriver log-based metrics and alert policies live separately in `GitLaw-co/k8s` (Terraform).

A post-deploy smoke-test Job in `GitLaw-co/k8s` runs the admin API create→delete sequence against a throwaway slug on every Documenso deploy. Failure alerts via standard k8s Job-failure signals.

---

## 6. Rotation

No automation. If the admin key is ever compromised:

1. Generate a new value: `openssl rand -base64 32`.
2. Update `documenso-secrets` SealedSecret (`DOCUMENSO_ADMIN_API_KEY` → new value).
3. `kubectl -n stg rollout restart deployment/documenso`.
4. Approximately 30-second window where env-ctl receives 401s — env-ctl retries absorb this.
5. Update env-ctl's secret store with the new key.

Leak-scenario likelihood for stg: low (key access is gated by corp-VPN + cluster RBAC, stored in SealedSecret, not plaintext in git). No scheduled rotation policy for stg.

---

## 7. Rate limiting

Admin endpoints share a dedicated bucket at 300 req/min (IP-keyed), separate from the general `/api/v2/*` bucket (100 req/min). Mounted in `apps/remix/server/router.ts`. Env-ctl burst profile (~6 calls per env operation) fits comfortably.

---

## 8. OpenAPI visibility

Admin paths are filtered out of the public `/api/v2/openapi.json` document. Future readers with out-of-band knowledge of this surface can construct calls from this README. The filter is in `packages/trpc/server/open-api.ts`.

---

## 9. Error codes

| Code | Meaning |
| --- | --- |
| `401 Unauthorized` | Missing or invalid admin key. |
| `403 Forbidden` | Owner account disabled. |
| `404 Not Found` | Team not in our organisation (for token/webhook create); organisation misconfigured. |
| `500 Internal Server Error` | Configuration issue (`DOCUMENSO_ONDEMAND_ORG_ID` unset / invalid, etc.). |

Idempotent-delete noop returns `200` with `{deleted: false, reason: 'not_found'}`, NOT 404.
