import type { TDocumentAuditLog, TDocumentAuditLogType } from '@documenso/lib/types/document-audit-logs';
import { DOCUMENT_AUDIT_LOG_TYPE } from '@documenso/lib/types/document-audit-logs';
import { prisma } from '@documenso/prisma';
import { PDF } from '@libpdf/core';
import { i18n } from '@lingui/core';

import { ZSupportedLanguageCodeSchema } from '../../constants/i18n';
import { parseDocumentAuditLogData } from '../../utils/document-audit-logs';
import { getTranslations } from '../../utils/i18n';
import { getOrganisationClaimByTeamId } from '../organisation/get-organisation-claims';
import type { GenerateCertificatePdfOptions } from './generate-certificate-pdf';
import { renderAuditLogs } from './render-audit-logs';

/**
 * Audit log event types rendered in the audit trail PDF.
 *
 * The PDF is a lifecycle record of the document's signing journey, so only
 * events that describe that journey are kept: creation, distribution
 * (sent/emails), recipient activity (opened/viewed/signed/rejected) and
 * completion. Setup noise — field/recipient/envelope-item create, update and
 * delete events, document meta/settings/title updates — is intentionally
 * excluded to keep the trail readable.
 */
export const AUDIT_TRAIL_PDF_EVENT_TYPES: TDocumentAuditLogType[] = [
  DOCUMENT_AUDIT_LOG_TYPE.DOCUMENT_CREATED,
  DOCUMENT_AUDIT_LOG_TYPE.DOCUMENT_SENT,
  DOCUMENT_AUDIT_LOG_TYPE.EMAIL_SENT,
  DOCUMENT_AUDIT_LOG_TYPE.DOCUMENT_OPENED,
  DOCUMENT_AUDIT_LOG_TYPE.DOCUMENT_VIEWED,
  DOCUMENT_AUDIT_LOG_TYPE.DOCUMENT_FIELD_INSERTED,
  DOCUMENT_AUDIT_LOG_TYPE.DOCUMENT_FIELD_UNINSERTED,
  DOCUMENT_AUDIT_LOG_TYPE.DOCUMENT_RECIPIENT_COMPLETED,
  DOCUMENT_AUDIT_LOG_TYPE.DOCUMENT_RECIPIENT_REJECTED,
  DOCUMENT_AUDIT_LOG_TYPE.DOCUMENT_COMPLETED,
];

type GenerateAuditLogPdfOptions = GenerateCertificatePdfOptions & {
  envelopeItems: string[];
  additionalAuditLogs?: TDocumentAuditLog[];
};

export const generateAuditLogPdf = async (options: GenerateAuditLogPdfOptions) => {
  const {
    envelope,
    envelopeOwner,
    envelopeItems,
    recipients,
    language,
    pageWidth,
    pageHeight,
    additionalAuditLogs = [],
  } = options;

  const documentLanguage = ZSupportedLanguageCodeSchema.parse(language);

  const [organisationClaim, partialAuditLogs, messages] = await Promise.all([
    getOrganisationClaimByTeamId({ teamId: envelope.teamId }),
    getAuditLogs(envelope.id),
    getTranslations(documentLanguage),
  ]);

  i18n.loadAndActivate({
    locale: documentLanguage,
    messages,
  });

  const ownerName = envelope.documentMeta?.externalOwnerName || 'GitLaw';
  const ownerEmail = envelope.documentMeta?.externalOwnerEmail || '';

  const auditLogs: TDocumentAuditLog[] = [...additionalAuditLogs, ...partialAuditLogs].reverse();

  const auditLogPages = await renderAuditLogs({
    envelope,
    envelopeOwner: {
      name: ownerName,
      email: ownerEmail,
    },
    envelopeItems,
    recipients,
    auditLogs,
    hidePoweredBy: organisationClaim.flags.hidePoweredBy ?? false,
    pageWidth,
    pageHeight,
    i18n,
  });

  return await PDF.merge(auditLogPages, {
    includeAnnotations: true,
  });
};

const getAuditLogs = async (envelopeId: string) => {
  const auditLogs = await prisma.documentAuditLog.findMany({
    where: {
      envelopeId,
      type: {
        in: AUDIT_TRAIL_PDF_EVENT_TYPES,
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  return auditLogs.map((auditLog) => parseDocumentAuditLogData(auditLog));
};
