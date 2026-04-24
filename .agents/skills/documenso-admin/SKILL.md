---
name: documenso-admin
description: Platform admin API for GitLaw's Documenso fork — fork-only HTTP surface at /api/v2/admin/* used for programmatic platform automation. This skill should be used when the user asks about "admin API", "admin-api", "documenso-admin", "env-ctl", "on-demand envs", "per-env team", "create team via API", "programmatic team/token/webhook", "DOCUMENSO_ADMIN_API_KEY", "DOCUMENSO_ONDEMAND_ORG_ID", "admin.team.createForPlatform", "/api/v2/admin/...", or when touching files under packages/trpc/server/admin-router/ (e.g. *-for-platform.ts, *-for-platform.types.ts). Triggers include "add an admin endpoint", "call the admin API", "how does admin authentication work", "idempotent team creation", or any task involving the six existing admin procedures (team/create, team/delete, api-token/create, api-token/delete, webhook/create, webhook/delete).
---

# Platform Admin API

## Overview

The admin API is a fork-only HTTP surface mounted at `/api/v2/admin/*` on the Documenso instance.
It is designed for platform automation by `env-ctl` — the GitLaw operator that provisions
per-environment tenants on demand. Every request authenticates via a static bearer token and
is executed in the context of a fixed Organisation owner, enabling full team/token/webhook
lifecycle management without UI interaction. The surface is intentionally hidden from the public
OpenAPI spec and rate-limited under its own bucket.

---

## Authentication

Every request must carry:

```
Authorization: Bearer $DOCUMENSO_ADMIN_API_KEY
```

**Middleware chain** (in `packages/trpc/server/trpc.ts`):

- `adminTokenMiddleware` — reads `Authorization` header, validates against `DOCUMENSO_ADMIN_API_KEY`, resolves the owner of the Organisation identified by `DOCUMENSO_ONDEMAND_ORG_ID`, injects `ctx.user` as that owner.
- `adminTokenProcedure` — tRPC procedure base that requires the above middleware.

**Error responses:**

| Condition | HTTP |
|---|---|
| Missing or wrong key | 401 |
| Owner account disabled | 403 |
| Org misconfigured / not found | 500 |

---

## Endpoints

All six endpoints are `POST`. All are mounted under `/api/v2/admin/`.

| Method | Path | Body (key fields) | Response (key fields) | Idempotency |
|---|---|---|---|---|
| POST | `/api/v2/admin/team/create` | `teamUrl`, `teamName?`, `inheritMembers?` | `{team, created}` | by `teamUrl` within org |
| POST | `/api/v2/admin/team/delete` | `teamId` | `{deleted, reason?}` | not-found → `{deleted:false, reason:"not_found"}` HTTP 200 |
| POST | `/api/v2/admin/api-token/create` | `teamId`, `tokenName` | `{token, plaintext?, created, plaintextAvailable}` | by `tokenName` within team; `plaintext` key present only on first create (omitted on replay) |
| POST | `/api/v2/admin/api-token/delete` | `teamId`, `tokenId` | `{deleted, reason?}` | idempotent-noop on absent |
| POST | `/api/v2/admin/webhook/create` | `teamId`, `webhookUrl`, `secret` (min 16 chars), `eventTriggers[]`, `enabled?` | `{webhook, created}` | by `webhookUrl` within team |
| POST | `/api/v2/admin/webhook/delete` | `teamId`, `webhookId` | `{deleted, reason?}` | idempotent-noop |

Request and response shapes are defined as Zod schemas in the corresponding `.types.ts` files
(see Implementation Map below). All fields are validated at the tRPC layer before any DB access.

---

## curl Examples

All examples target staging. Replace `$KEY` with the actual `DOCUMENSO_ADMIN_API_KEY` value.

### Create a team (happy path)

```bash
curl -s -X POST https://esign.stg.gitlaw.co/api/v2/admin/team/create \
  -H "Authorization: Bearer $KEY" \
  -H "Content-Type: application/json" \
  -d '{"teamUrl":"acme-staging","teamName":"Acme (Staging)"}' | jq .
# {"team":{...},"created":true}
```

### Idempotent replay — same teamUrl, already exists

```bash
curl -s -X POST https://esign.stg.gitlaw.co/api/v2/admin/team/create \
  -H "Authorization: Bearer $KEY" \
  -H "Content-Type: application/json" \
  -d '{"teamUrl":"acme-staging"}' | jq .
# {"team":{...},"created":false}
```

### Create API token (plaintext returned once)

```bash
curl -s -X POST https://esign.stg.gitlaw.co/api/v2/admin/api-token/create \
  -H "Authorization: Bearer $KEY" \
  -H "Content-Type: application/json" \
  -d '{"teamId":42,"tokenName":"env-ctl-token"}' | jq .
# first call  → {"token":{...},"plaintext":"api_...","created":true,"plaintextAvailable":true}
# replay      → {"token":{...},"created":false,"plaintextAvailable":false}   # note: plaintext key omitted
```

Store the `plaintext` value immediately — it cannot be retrieved again.

### Create webhook (cluster-internal URL; secret >= 16 chars)

```bash
curl -s -X POST https://esign.stg.gitlaw.co/api/v2/admin/webhook/create \
  -H "Authorization: Bearer $KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "teamId": 42,
    "webhookUrl": "http://env-ctl.env-ctl.svc.cluster.local/hooks/documenso",
    "secret": "a-secret-with-16plus-chars",
    "eventTriggers": ["DOCUMENT_COMPLETED","DOCUMENT_SENT"],
    "enabled": true
  }' | jq .
```

### Delete flow (webhook → token → team)

```bash
# 1. Delete webhook
curl -s -X POST https://esign.stg.gitlaw.co/api/v2/admin/webhook/delete \
  -H "Authorization: Bearer $KEY" \
  -H "Content-Type: application/json" \
  -d '{"teamId":42,"webhookId":"clz8abc123xyz000"}' | jq .  # webhookId is a cuid string

# 2. Delete API token
curl -s -X POST https://esign.stg.gitlaw.co/api/v2/admin/api-token/delete \
  -H "Authorization: Bearer $KEY" \
  -H "Content-Type: application/json" \
  -d '{"teamId":42,"tokenId":3}' | jq .

# 3. Delete team
curl -s -X POST https://esign.stg.gitlaw.co/api/v2/admin/team/delete \
  -H "Authorization: Bearer $KEY" \
  -H "Content-Type: application/json" \
  -d '{"teamId":42}' | jq .
```

---

## Idempotency Contract

Create endpoints are idempotent under **sequential single-caller** usage — which matches
`env-ctl`'s real pattern (registry lock held per environment).

**True concurrent duplicate requests are NOT guaranteed safe at the Documenso layer:**

- `team/create`: the losing concurrent call may receive `400 ALREADY_EXISTS` rather than
  the `{created:false}` idempotent response.
- `webhook/create` and `api-token/create`: may silently produce duplicate DB rows — there
  is no database-level unique constraint backing the idempotency check.

Callers that require concurrency safety must serialize at their own layer (env-ctl's registry
lock is the correct mechanism; do not remove it expecting the API to handle it).

---

## Implementation Map

Where each piece lives — use this when modifying or extending the admin API:

| What | Where |
|---|---|
| Middleware + base procedure | `packages/trpc/server/trpc.ts` (`adminTokenMiddleware`, `adminTokenProcedure`) |
| Procedures (6 files) | `packages/trpc/server/admin-router/*-for-platform.ts` |
| Zod schemas + route meta | `packages/trpc/server/admin-router/*-for-platform.types.ts` |
| Router registration | `packages/trpc/server/admin-router/router.ts` (`team`, `apiToken`, `webhook` namespaces) |
| Team creation helper | `packages/lib/server-only/team/create-team-for-platform.ts` |
| Org + owner loader | `packages/lib/server-only/organisation/get-organisation-with-owner-for-admin-token.ts` |
| Rate-limit bucket | `packages/lib/server-only/rate-limit/rate-limits.ts` (`adminV2RateLimit`, 300 req/min, IP-keyed) |
| Rate-limit wiring | `apps/remix/server/router.ts` (`bypassForPathPrefixes` composition) |
| OpenAPI filter (hidden) | `packages/trpc/server/open-api-public.ts` |
| Pino header redaction | `packages/lib/utils/logger.ts` |
| Auth union widening | `packages/lib/universal/extract-request-metadata.ts` (`'apiAdminToken'`) |
| Env vars | `.env.example`, `turbo.json` globalEnv |

**Fork-sync hygiene**: cross-reference `FORK-DELTAS.md` at repo root for conflict-risk
categories. When adding new admin endpoints, prefer new files in `admin-router/` over
modifying upstream files. When upstream files must be touched, update `FORK-DELTAS.md`
in the same PR.

---

## Adding a New Admin Endpoint

Follow this pattern (from the existing 6 procedures):

1. Create `packages/trpc/server/admin-router/{verb}-{resource}-for-platform.types.ts` with:
   - `Z{Name}RequestSchema` (Zod)
   - `Z{Name}ResponseSchema` (Zod)
   - `{name}Meta: TrpcRouteMeta` with `path: '/admin/{resource}/{verb}'`, `method: 'POST'`,
     `tags: ['Admin']`, custom `adminToken: true` marker.

2. Create `packages/trpc/server/admin-router/{verb}-{resource}-for-platform.ts`:
   - Use `adminTokenProcedure`.
   - First statement: `ctx.logger.info(...)`.
   - Use `env('DOCUMENSO_ONDEMAND_ORG_ID')!` for the fixed org.
   - Call existing `server-only` helper with `userId: ctx.user.id`.

3. Register the procedure in `admin-router/router.ts` under the appropriate namespace.

4. Type-check: `npx tsc --noEmit -p packages/trpc`.

5. Lint: `npm run lint --workspace=@documenso/trpc`.

---

## Bootstrap (One-Time Per Instance)

1. Sign up `platform-admin@git.law` via the UI.
   For staging: SQL-flip `emailVerified` and add `ADMIN` role directly in the DB.
2. Create the `on-demand-envs` Organisation via the UI while logged in as `platform-admin`.
3. Generate an admin key: `openssl rand -base64 32`.
4. Set env vars in the pod:
   - `DOCUMENSO_ADMIN_API_KEY` — via `documenso-secrets` SealedSecret.
   - `DOCUMENSO_ONDEMAND_ORG_ID` — plain value (not secret).
5. Smoke-test:
   ```bash
   curl -X POST https://esign.stg.gitlaw.co/api/v2/admin/team/create \
     -H "Authorization: Bearer $KEY" \
     -H "Content-Type: application/json" \
     -d '{"teamUrl":"smoke"}'
   ```

For full bootstrap details, operational invariants, key rotation, and observability, see
`packages/trpc/server/admin-router/README-admin-api.md`.

---

## Common Pitfalls

- **Do not use `platform-admin@git.law` interactively via the UI.** All document actions
  would be attributed to that account, polluting audit trails.
- **`team/delete` triggers an upstream team-deleted email** to org ADMIN-group members
  (currently: platform-admin only). This is an accepted trade-off; see README-admin-api.md §3.
- **`/api/v2-beta/admin/*` also works** (same router), but those requests hit the general
  v2 rate-limit bucket, not the dedicated `adminV2RateLimit` bucket. `env-ctl` must use
  `/api/v2/admin/*` to get the correct rate-limit treatment.
- **CODEOWNERS split**: admin-router surface → `@neptunix-gl`; upstream-modified shared
  files → `@camballe`. Follow this when opening PRs.
