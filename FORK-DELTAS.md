# GitLaw Fork Deltas

This fork carries a set of deviations from upstream `documenso/documenso`. This
document inventories them and highlights files where upstream changes are most
likely to cause merge conflicts during the weekly `sync-upstream.yml` run.

Keeping this file up to date is the responsibility of whoever introduces a new
fork delta.

## Categories

### New fork-only files (zero upstream-sync risk)

These files do not exist upstream. Upstream-sync never touches them.

- `packages/trpc/server/admin-router/create-team-for-platform.ts` + `.types.ts`
- `packages/trpc/server/admin-router/delete-team-for-platform.ts` + `.types.ts`
- `packages/trpc/server/admin-router/create-api-token-for-platform.ts` + `.types.ts`
- `packages/trpc/server/admin-router/delete-api-token-for-platform.ts` + `.types.ts`
- `packages/trpc/server/admin-router/create-webhook-for-platform.ts` + `.types.ts`
- `packages/trpc/server/admin-router/delete-webhook-for-platform.ts` + `.types.ts`
- `packages/trpc/server/admin-router/README-admin-api.md`
- `packages/trpc/server/open-api-public.ts` — filters `/admin/*` paths out of the public OpenAPI spec.
- `packages/lib/server-only/organisation/get-organisation-with-owner-for-admin-token.ts`
- `packages/lib/server-only/team/create-team-for-platform.ts`

### Modified upstream files

Ordered by conflict-resolution risk during upstream sync.

#### Low risk — appends / additions only

| File | Our change | Conflict red flag |
| --- | --- | --- |
| `.env.example` | Added `# [[ADMIN API]]` section at the end | Upstream restructures the file |
| `turbo.json` | Added `DOCUMENSO_ADMIN_API_KEY`, `DOCUMENSO_ONDEMAND_ORG_ID` to `globalEnv` | Upstream renames or reshapes `globalEnv` |
| `packages/lib/server-only/rate-limit/rate-limits.ts` | Added `adminV2RateLimit` entry | Upstream reorders entries or changes the factory signature |
| `packages/lib/universal/extract-request-metadata.ts` | Widened `ApiRequestMetadata.auth` union with `'apiAdminToken'` | Upstream replaces the union with an enum/const |
| `packages/lib/utils/logger.ts` | Added pino `redact` config covering `Authorization` header paths | Upstream replaces pino or introduces its own redact config |
| `.github/workflows/ci.yml` | Added `dev` to `pull_request.branches` with `paths:` filter | Upstream overhauls CI triggers |
| `packages/trpc/server/admin-router/router.ts` | Registered 6 new procedures under existing namespaces plus two new (`apiToken`, `webhook`) | Upstream restructures the admin router shape |

#### Medium risk — edits inside actively-maintained files

| File | Our change | Conflict red flag |
| --- | --- | --- |
| `packages/trpc/server/trpc.ts` | Appended `adminTokenMiddleware` + `adminTokenProcedure` at end of file | Upstream edits the import block or inserts its own new middleware at the end |
| `apps/remix/server/router.ts` | Added `bypassForPathPrefixes` helper, `/api/v2/admin/*` mount, imports `openApiDocument` from `open-api-public.ts` instead of `open-api.ts` | Upstream reshuffles the rate-limit mounting order or changes how openApiDocument is consumed |

All other team, webhook, api-token, and open-api upstream helpers are **byte-for-byte identical to upstream**. We intentionally avoid modifying them so upstream-sync PRs that touch those files cannot conflict with our fork.

## Principles when adding new fork deltas

1. **Prefer new files over edits.** A new file in a fork-only directory is free during upstream sync. An edit to an upstream file is weekly merge-conflict risk.
2. **Prefer composition over factory extension.** Wrapping an upstream factory at the call site keeps the factory untouched. Extending a factory signature couples us to upstream evolution.
3. **Accept minor UX costs to avoid fork-delta creep.** Example: the admin API accepts the upstream `deleteTeam` helper's team-deleted email even though it's noisy for automated teardown, because modifying the helper would cost a merge conflict on every upstream sync touching the team module.
4. **Update this file.** Every new fork delta adds a row to the appropriate table and notes its red flag.

## Related

- `packages/trpc/server/admin-router/README-admin-api.md` — operational contract for the admin API.
- `.github/CODEOWNERS` — forces review on files listed above when upstream-sync opens a PR.
- `.github/workflows/sync-upstream.yml` — the weekly sync itself.
