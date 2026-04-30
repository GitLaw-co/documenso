import { prisma } from '@documenso/prisma';

import { createTeam } from './create-team';

/**
 * Admin-API-only wrapper around `createTeam` that returns the created team.
 *
 * Upstream `createTeam` returns `Promise<void>`; the admin procedure at
 * `admin.team.createForPlatform` needs the team object in the response.
 * Rather than modify the upstream helper (which would cost us a merge
 * conflict on every upstream sync touching the team module), we keep
 * `createTeam` untouched and do a post-create lookup here.
 *
 * The extra query is trivial in cost and runs only for admin-API traffic.
 */
export const createTeamForPlatform = async ({
  userId,
  teamName,
  teamUrl,
  organisationId,
  inheritMembers,
}: {
  userId: number;
  teamName: string;
  teamUrl: string;
  organisationId: string;
  inheritMembers: boolean;
}) => {
  await createTeam({ userId, teamName, teamUrl, organisationId, inheritMembers });

  return prisma.team.findFirstOrThrow({
    where: { url: teamUrl, organisationId },
    include: { teamGroups: true },
  });
};
