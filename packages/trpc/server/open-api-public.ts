import { openApiDocument as rawOpenApiDocument } from './open-api';

/**
 * Public OpenAPI document served at /api/v2/openapi.json.
 *
 * Filters out any path under `/admin/*` so the fork-only platform admin
 * API (see packages/trpc/server/admin-router/README-admin-api.md) does
 * not appear in the unauthenticated public spec. Runtime routing via the
 * OpenAPI handler walks the router directly and is unaffected — admin
 * procedures remain callable by clients that know the path.
 *
 * Wrapping the upstream `openApiDocument` in a new file (instead of
 * editing `open-api.ts`) keeps the upstream file byte-for-byte identical
 * so weekly upstream-sync PRs never conflict on it.
 */
export const openApiDocument = {
  ...rawOpenApiDocument,
  paths: Object.fromEntries(
    Object.entries(rawOpenApiDocument.paths ?? {}).filter(([path]) => !path.startsWith('/admin/')),
  ),
};
