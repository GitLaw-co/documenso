import type { DocumentMeta, Recipient } from '@prisma/client';
import { RecipientRole } from '@prisma/client';

import { RECIPIENT_ROLE_TO_EMAIL_TYPE } from '../constants/recipient-roles';
import type { TDocumentAuditLog } from '../types/document-audit-logs';
import { DOCUMENT_AUDIT_LOG_TYPE, DOCUMENT_EMAIL_TYPE } from '../types/document-audit-logs';
import type { ApiRequestMetadata } from '../universal/extract-request-metadata';
import { createDocumentAuditLogData } from './document-audit-logs';

type AuditTrailDocumentMeta = Pick<DocumentMeta, 'externalOwnerName' | 'externalOwnerEmail'> | null | undefined;

export const isReminderEmailLog = (auditLog: TDocumentAuditLog) =>
  auditLog.type === DOCUMENT_AUDIT_LOG_TYPE.EMAIL_SENT &&
  (auditLog.data.isResending || auditLog.data.emailType === DOCUMENT_EMAIL_TYPE.REMINDER);

/** DOCUMENT_SENT stands in for the first send only when no per-recipient invitation email was logged. */
export const selectAuditTrailSendLogs = (auditLogs: TDocumentAuditLog[]) => {
  const hasInvitationEmailLog = auditLogs.some(
    (auditLog) => auditLog.type === DOCUMENT_AUDIT_LOG_TYPE.EMAIL_SENT && !isReminderEmailLog(auditLog),
  );

  if (!hasInvitationEmailLog) {
    return auditLogs;
  }

  return auditLogs.filter((auditLog) => auditLog.type !== DOCUMENT_AUDIT_LOG_TYPE.DOCUMENT_SENT);
};

/** A team API token records the team name with no user id or email, see the API v1 auth middleware. */
const isTeamApiTokenActor = (auditLog: TDocumentAuditLog) =>
  !auditLog.userId && !auditLog.email && Boolean(auditLog.name);

/** Shows the external owner as the actor of owner actions made through the service team's API token. */
export const attributeApiActionsToExternalOwner = (
  auditLogs: TDocumentAuditLog[],
  documentMeta: AuditTrailDocumentMeta,
): TDocumentAuditLog[] => {
  const externalOwnerEmail = documentMeta?.externalOwnerEmail;

  if (!externalOwnerEmail) {
    return auditLogs;
  }

  const externalOwnerName = documentMeta?.externalOwnerName?.trim() || externalOwnerEmail;

  return auditLogs.map((auditLog) =>
    isTeamApiTokenActor(auditLog) ? { ...auditLog, name: externalOwnerName, email: externalOwnerEmail } : auditLog,
  );
};

type DelegatedReminderAuditLogOptions = {
  envelopeId: string;
  documentMeta: AuditTrailDocumentMeta;
  recipients: Pick<Recipient, 'id' | 'email' | 'name' | 'role'>[];
  requestMetadata: ApiRequestMetadata;
};

/** For a resend while Documenso's signing emails are off: GitLaw sends its own reminder for envelopes it owns. */
export const buildDelegatedReminderAuditLogs = ({
  envelopeId,
  documentMeta,
  recipients,
  requestMetadata,
}: DelegatedReminderAuditLogOptions) => {
  if (!documentMeta?.externalOwnerEmail) {
    return [];
  }

  return recipients.flatMap((recipient) => {
    if (recipient.role === RecipientRole.CC) {
      return [];
    }

    return createDocumentAuditLogData({
      type: DOCUMENT_AUDIT_LOG_TYPE.EMAIL_SENT,
      envelopeId,
      metadata: requestMetadata,
      data: {
        emailType: RECIPIENT_ROLE_TO_EMAIL_TYPE[recipient.role],
        recipientEmail: recipient.email,
        recipientName: recipient.name,
        recipientRole: recipient.role,
        recipientId: recipient.id,
        isResending: true,
      },
    });
  });
};
