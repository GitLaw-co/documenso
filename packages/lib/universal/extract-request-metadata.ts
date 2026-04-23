import { z } from 'zod';

import { getIpAddress } from './get-ip-address';

const ZIpSchema = z.string().ip();

export const ZRequestMetadataSchema = z.object({
  ipAddress: ZIpSchema.optional(),
  userAgent: z.string().optional(),
});

export type RequestMetadata = z.infer<typeof ZRequestMetadataSchema>;

export type ApiRequestMetadata = {
  /**
   * The general metadata of the request.
   */
  requestMetadata: RequestMetadata;

  /**
   * The source of the request.
   */
  source: 'apiV1' | 'apiV2' | 'app';

  /**
   * The method of authentication used to access the API.
   *
   * - `api`: per-team API token (Authorization: Bearer api_xxx).
   * - `session`: user web session (cookie).
   * - `apiAdminToken`: platform-admin API token (Authorization: Bearer <DOCUMENSO_ADMIN_API_KEY>),
   *   used by automation such as env-ctl. Scoped to the organisation identified by
   *   DOCUMENSO_ONDEMAND_ORG_ID; actions are attributed to the organisation owner.
   * - `null`: the request is not authenticated.
   */
  auth: 'api' | 'session' | 'apiAdminToken' | null;

  /**
   * The user that is performing the action.
   *
   * If a team API key is used, the user will classified as the team.
   */
  auditUser?: {
    id: number | null;
    email: string | null;
    name: string | null;
  };
};

export const extractRequestMetadata = (req: Request): RequestMetadata => {
  let ip: string | undefined = undefined;

  try {
    ip = getIpAddress(req);
  } catch {
    // Do nothing.
  }

  const parsedIp = ZIpSchema.safeParse(ip);

  const ipAddress = parsedIp.success ? parsedIp.data : undefined;
  const userAgent = req.headers.get('user-agent');

  return {
    ipAddress,
    userAgent: userAgent ?? undefined,
  };
};
