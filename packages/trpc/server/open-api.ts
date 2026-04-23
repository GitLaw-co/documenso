import { generateOpenApiDocument } from 'trpc-to-openapi';

import { NEXT_PUBLIC_WEBAPP_URL } from '@documenso/lib/constants/app';

import { appRouter } from './router';

const rawOpenApiDocument = generateOpenApiDocument(appRouter, {
  title: 'Documenso v2 API',
  description:
    'Welcome to the Documenso v2 API.\n\nThis API provides access to our system, which you can use to integrate applications, automate workflows, or build custom tools.',
  version: '1.0.0',
  baseUrl: `${NEXT_PUBLIC_WEBAPP_URL()}/api/v2`,
  securitySchemes: {
    apiKey: {
      type: 'apiKey',
      in: 'header',
      name: 'Authorization',
    },
  },
});

// Admin procedures (path prefix /admin/*) are intentionally hidden from the
// public OpenAPI spec. The procedures remain callable via the OpenAPI handler
// at /api/v2/admin/*; this filter only affects the generated document served
// at /api/v2/openapi.json. Consumers must have out-of-band knowledge of the
// admin API surface (documented in packages/trpc/server/admin-router/README-admin-api.md).
const publicPaths = Object.fromEntries(
  Object.entries(rawOpenApiDocument.paths ?? {}).filter(([path]) => !path.startsWith('/admin/')),
);

export const openApiDocument = {
  ...rawOpenApiDocument,
  paths: publicPaths,
  /**
   * Dirty way to pass through the security field.
   */
  security: [
    {
      apiKey: [],
    },
  ],
};
