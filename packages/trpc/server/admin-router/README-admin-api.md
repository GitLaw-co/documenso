# Admin API (platform automation)

HTTP surface at `/api/v2/admin/*` for automated platform operations. Authenticates via a single static bearer token (`DOCUMENSO_ADMIN_API_KEY`) and impersonates the owner of a fixed Organisation identified by `DOCUMENSO_ONDEMAND_ORG_ID`.

This is a fork-only surface — not present in upstream Documenso.

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

**Idempotency scope.** The create endpoints are idempotent under sequential single-caller usage. True concurrent duplicate requests with the same idempotency key are NOT guaranteed idempotent at the Documenso layer — two simultaneous `team/create` calls with the same `teamUrl` may yield one 200 + one 400 `ALREADY_EXISTS`; two simultaneous `webhook/create` or `api-token/create` calls with the same name/URL may silently produce duplicate rows. Upstream schemas lack DB-level uniqueness on these idempotency keys. Callers that need concurrency safety must serialize at their own layer.

---

## 2. Bootstrap & rotation

Bootstrap, rotation, and operational details live in internal ops docs.

---

## 3. Identity & permissions model

Admin API requests impersonate the Organisation owner identified by `DOCUMENSO_ONDEMAND_ORG_ID`. The owner is a member of the `ADMIN` organisation group, which grants `TeamMemberRole.ADMIN` on every team in the organisation. All per-team permission checks (`MANAGE_TEAM`, `DELETE_TEAM`, etc.) are satisfied by this role — no bypass flags in `packages/lib/server-only/*` helpers.

---

## 4. Rate limiting

Admin endpoints share a dedicated bucket at 300 req/min (IP-keyed), separate from the general `/api/v2/*` bucket (100 req/min). Mounted in `apps/remix/server/router.ts`.

---

## 5. OpenAPI visibility

Admin paths are filtered out of the public `/api/v2/openapi.json` document. The filter is in `packages/trpc/server/open-api-public.ts` — it wraps the upstream-generated document from `open-api.ts` rather than modifying it (FORK-DELTAS.md has the rationale).

---

## 6. Error codes

| Code | Meaning |
| --- | --- |
| `401 Unauthorized` | Missing or invalid admin key. |
| `403 Forbidden` | Owner account disabled. |
| `404 Not Found` | Team not in our organisation (for token/webhook create); organisation misconfigured. |
| `500 Internal Server Error` | Configuration issue (`DOCUMENSO_ONDEMAND_ORG_ID` unset / invalid, etc.). |

Idempotent-delete noop returns `200` with `{deleted: false, reason: 'not_found'}`, NOT 404.
