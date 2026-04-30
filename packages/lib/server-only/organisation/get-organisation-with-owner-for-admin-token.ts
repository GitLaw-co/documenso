import type { Organisation, User } from '@prisma/client';

import { prisma } from '@documenso/prisma';

export type AdminTokenOrganisationWithOwner = {
  organisation: Organisation;
  owner: User;
};

export type AdminTokenOrganisationLookupError =
  | { kind: 'not_found' }
  | { kind: 'owner_missing' }
  | { kind: 'owner_disabled' };

export type AdminTokenOrganisationLookupResult =
  | { ok: true; value: AdminTokenOrganisationWithOwner }
  | { ok: false; error: AdminTokenOrganisationLookupError };

/**
 * Loads the Organisation identified by `DOCUMENSO_ONDEMAND_ORG_ID` together with its
 * owner user. Used by the admin-API token middleware to establish the caller identity:
 * the middleware impersonates the organisation owner so that existing per-team
 * permission checks (`buildTeamWhereQuery`, etc.) grant access without bypass flags.
 *
 * Returns a Result-shaped value — the caller decides how to map lookup failures to
 * HTTP status codes, since misconfiguration (organisation not found, owner deleted)
 * and policy refusal (disabled owner) have different meanings in different callers.
 */
export const getOrganisationWithOwnerForAdminToken = async (
  organisationId: string,
): Promise<AdminTokenOrganisationLookupResult> => {
  const organisation = await prisma.organisation.findUnique({
    where: { id: organisationId },
    include: { owner: true },
  });

  if (!organisation) {
    return { ok: false, error: { kind: 'not_found' } };
  }

  if (!organisation.owner) {
    return { ok: false, error: { kind: 'owner_missing' } };
  }

  if (organisation.owner.disabled) {
    return { ok: false, error: { kind: 'owner_disabled' } };
  }

  const { owner, ...organisationWithoutOwner } = organisation;

  return { ok: true, value: { organisation: organisationWithoutOwner, owner } };
};
