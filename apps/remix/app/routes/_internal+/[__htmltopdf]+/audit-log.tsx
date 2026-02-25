import { msg } from '@lingui/core/macro';
import { useLingui } from '@lingui/react';
import { EnvelopeType } from '@prisma/client';
import { redirect } from 'react-router';

import { DOCUMENT_STATUS } from '@documenso/lib/constants/document';
import { ZSupportedLanguageCodeSchema } from '@documenso/lib/constants/i18n';
import { RECIPIENT_ROLES_DESCRIPTION } from '@documenso/lib/constants/recipient-roles';
import { unsafeGetEntireEnvelope } from '@documenso/lib/server-only/admin/get-entire-document';
import { decryptSecondaryData } from '@documenso/lib/server-only/crypto/decrypt';
import { findDocumentAuditLogs } from '@documenso/lib/server-only/document/find-document-audit-logs';
import { getOrganisationClaimByTeamId } from '@documenso/lib/server-only/organisation/get-organisation-claims';
import { mapSecondaryIdToDocumentId } from '@documenso/lib/utils/envelope';
import { getTranslations } from '@documenso/lib/utils/i18n';

import appStylesheet from '~/app.css?url';
import { BrandingLogo } from '~/components/general/branding-logo';
import { InternalAuditLogTable } from '~/components/tables/internal-audit-log-table';

import type { Route } from './+types/audit-log';
import pdfPagesStylesheet from './pdf-pages.css?url';

export const links: Route.LinksFunction = () => [
  { rel: 'stylesheet', href: appStylesheet },
  { rel: 'stylesheet', href: pdfPagesStylesheet },
];

export async function loader({ request }: Route.LoaderArgs) {
  const d = new URL(request.url).searchParams.get('d');

  if (typeof d !== 'string' || !d) {
    throw redirect('/');
  }

  const rawDocumentId = decryptSecondaryData(d);

  if (!rawDocumentId || isNaN(Number(rawDocumentId))) {
    throw redirect('/');
  }

  const documentId = Number(rawDocumentId);

  const envelope = await unsafeGetEntireEnvelope({
    id: {
      type: 'documentId',
      id: documentId,
    },
    type: EnvelopeType.DOCUMENT,
  }).catch(() => null);

  if (!envelope) {
    throw redirect('/');
  }

  const organisationClaim = await getOrganisationClaimByTeamId({ teamId: envelope.teamId });

  const documentLanguage = ZSupportedLanguageCodeSchema.parse(envelope.documentMeta?.language);

  const { data: auditLogs } = await findDocumentAuditLogs({
    documentId: documentId,
    userId: envelope.userId,
    teamId: envelope.teamId,
    perPage: 100_000,
  });

  const messages = await getTranslations(documentLanguage);

  // Use external owner info from metadata if available (GitLaw user), otherwise fall back to "GitLaw"
  const ownerName = envelope.documentMeta?.externalOwnerName || 'GitLaw';
  const ownerEmail = envelope.documentMeta?.externalOwnerEmail || '';

  // Derive effective status: if envelope says COMPLETED/REJECTED, use that.
  // Otherwise check if all signers/approvers have completed (seal job may not have run yet)
  let effectiveStatus = envelope.status;
  if (envelope.status === 'PENDING') {
    const signingRecipients = envelope.recipients.filter(
      (r) => r.role === 'SIGNER' || r.role === 'APPROVER',
    );
    const allSigned =
      signingRecipients.length > 0 && signingRecipients.every((r) => r.signingStatus === 'SIGNED');
    const anyRejected = envelope.recipients.some((r) => r.signingStatus === 'REJECTED');

    if (anyRejected) {
      effectiveStatus = 'REJECTED';
    } else if (allSigned) {
      effectiveStatus = 'COMPLETED';
    }
  }

  return {
    auditLogs,
    document: {
      id: mapSecondaryIdToDocumentId(envelope.secondaryId),
      title: envelope.title,
      status: effectiveStatus,
      envelopeId: envelope.id,
      user: {
        name: ownerName,
        email: ownerEmail,
      },
      recipients: envelope.recipients,
      createdAt: envelope.createdAt,
      updatedAt: envelope.updatedAt,
      deletedAt: envelope.deletedAt,
      documentMeta: envelope.documentMeta,
    },
    hidePoweredBy: organisationClaim.flags.hidePoweredBy,
    documentLanguage,
    messages,
  };
}

/**
 * DO NOT USE TRANS. YOU MUST USE _ FOR THIS FILE AND ALL CHILDREN COMPONENTS.
 *
 * Cannot use dynamicActivate by itself to translate this specific page and all
 * children components because `not-found.tsx` page runs and overrides the i18n.
 *
 * Update: Maybe <Trans> tags work now after RR7 migration.
 */
export default function AuditLog({ loaderData }: Route.ComponentProps) {
  const { auditLogs, document, documentLanguage, hidePoweredBy, messages } = loaderData;

  const { i18n, _ } = useLingui();

  i18n.loadAndActivate({ locale: documentLanguage, messages });

  // Reverse logs to show oldest first (chronological order)
  const chronologicalLogs = [...auditLogs].reverse();

  return (
    <div className="bg-white">
      <div className="pdf-page print-provider pointer-events-none mx-auto max-w-screen-md bg-white p-8">
        <div className="mb-6 flex items-center justify-between border-b pb-4">
          <BrandingLogo className="h-8" />
          <h1 className="text-2xl font-light text-gray-600">{_(msg`Audit Trail`)}</h1>
        </div>

        <div className="pdf-page-content">
          <div className="space-y-3 text-sm">
            <div className="flex">
              <span className="w-48 font-semibold uppercase text-gray-600">{_(msg`Title`)}</span>
              <span className="text-gray-900">{document.title}</span>
            </div>

            <div className="flex">
              <span className="w-48 font-semibold uppercase text-gray-600">
                {_(msg`Document ID`)}
              </span>
              <span className="font-mono text-gray-900">{document.envelopeId}</span>
            </div>

            <div className="flex">
              <span className="w-48 font-semibold uppercase text-gray-600">{_(msg`Owner`)}</span>
              <span className="text-gray-900">
                {document.user.name}
                {document.user.email && ` (${document.user.email})`}
              </span>
            </div>

            <div className="flex">
              <span className="w-48 font-semibold uppercase text-gray-600">{_(msg`Status`)}</span>
              <span className="flex items-center gap-2 text-gray-900">
                <span className="h-2 w-2 rounded-full bg-green-500" />
                {_(
                  document.deletedAt ? msg`Deleted` : DOCUMENT_STATUS[document.status].description,
                )}
              </span>
            </div>

            <div className="flex">
              <span className="w-48 font-semibold uppercase text-gray-600">
                {_(msg`Recipients`)}
              </span>
              <div className="text-gray-900">
                {document.recipients.map((recipient, i) => (
                  <span key={recipient.id}>
                    [{_(RECIPIENT_ROLES_DESCRIPTION[recipient.role].roleName)}] {recipient.name} (
                    {recipient.email}){i < document.recipients.length - 1 ? ', ' : ''}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-8">
            <h2 className="mb-6 text-lg font-medium text-gray-700">{_(msg`Document History`)}</h2>
            <InternalAuditLogTable logs={chronologicalLogs} />
          </div>
        </div>

        {!hidePoweredBy && (
          <div className="pdf-page-footer border-t pt-4">
            <div className="flex items-center gap-x-2 text-sm text-gray-500">
              <span>{_(msg`Powered by`)}</span>
              <BrandingLogo className="h-5" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
