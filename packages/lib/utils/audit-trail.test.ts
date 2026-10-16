import { RecipientRole } from '@prisma/client';
import { describe, expect, it } from 'vitest';

import type { TDocumentAuditLog } from '../types/document-audit-logs';
import type { ApiRequestMetadata } from '../universal/extract-request-metadata';
import {
  attributeApiActionsToExternalOwner,
  buildDelegatedReminderAuditLogs,
  isReminderEmailLog,
  selectAuditTrailSendLogs,
} from './audit-trail';

const base = { id: 'log', createdAt: new Date(0), envelopeId: 'envelope_1', ipAddress: null, userAgent: null };
const teamApiActor = { userId: null, email: null, name: 'GitLaw' };
const recipientActor = { userId: null, email: 'signer@example.com', name: 'Sam Signer' };
const systemActor = { userId: null, email: null, name: null };
const recipientData = {
  recipientId: 7,
  recipientEmail: 'signer@example.com',
  recipientName: 'Sam Signer',
  recipientRole: RecipientRole.SIGNER,
};

const documentSent: TDocumentAuditLog = { ...base, ...teamApiActor, type: 'DOCUMENT_SENT', data: {} };

const emailSent = (data: { emailType: 'SIGNING_REQUEST' | 'REMINDER'; isResending: boolean }): TDocumentAuditLog => ({
  ...base,
  ...teamApiActor,
  type: 'EMAIL_SENT',
  data: { ...recipientData, ...data },
});

const invitation = emailSent({ emailType: 'SIGNING_REQUEST', isResending: false });
const manualResend = emailSent({ emailType: 'SIGNING_REQUEST', isResending: true });
const automaticReminder = emailSent({ emailType: 'REMINDER', isResending: false });

const recipientViewed: TDocumentAuditLog = {
  ...base,
  ...recipientActor,
  type: 'DOCUMENT_VIEWED',
  data: { recipientId: 7, recipientEmail: 'signer@example.com', recipientName: 'Sam Signer', recipientRole: 'SIGNER' },
};

const documentCompleted: TDocumentAuditLog = {
  ...base,
  ...systemActor,
  type: 'DOCUMENT_COMPLETED',
  data: { transactionId: 'tx' },
};

const externalOwner = { externalOwnerName: 'Jane Owner', externalOwnerEmail: 'jane@example.com' };

const requestMetadata: ApiRequestMetadata = {
  requestMetadata: { ipAddress: '10.0.0.1', userAgent: 'back-law' },
  source: 'apiV1',
  auth: 'api',
  auditUser: { id: null, email: null, name: 'GitLaw' },
};

describe('isReminderEmailLog', () => {
  it('treats a manual resend and an automatic reminder as reminders', () => {
    expect(isReminderEmailLog(manualResend)).toBe(true);
    expect(isReminderEmailLog(automaticReminder)).toBe(true);
  });

  it('treats the first invitation as a send', () => {
    expect(isReminderEmailLog(invitation)).toBe(false);
    expect(isReminderEmailLog(documentSent)).toBe(false);
  });
});

describe('selectAuditTrailSendLogs', () => {
  it('keeps DOCUMENT_SENT as the send row when only reminders were emailed by Documenso', () => {
    const logs = [documentSent, manualResend, recipientViewed];

    expect(selectAuditTrailSendLogs(logs)).toEqual(logs);
  });

  it('drops DOCUMENT_SENT when per-recipient invitations exist, so a send is not listed twice', () => {
    expect(selectAuditTrailSendLogs([documentSent, invitation, manualResend])).toEqual([invitation, manualResend]);
  });
});

describe('attributeApiActionsToExternalOwner', () => {
  it('names the external owner on actions made through the team API token', () => {
    const [sent, resent] = attributeApiActionsToExternalOwner([documentSent, manualResend], externalOwner);

    expect(sent).toMatchObject({ name: 'Jane Owner', email: 'jane@example.com', userId: null });
    expect(resent).toMatchObject({ name: 'Jane Owner', email: 'jane@example.com' });
  });

  it('keeps recipients and the system as the actor of their own events', () => {
    const logs = [recipientViewed, documentCompleted];

    expect(attributeApiActionsToExternalOwner(logs, externalOwner)).toEqual(logs);
  });

  it('falls back to the owner email when the owner has no name', () => {
    const [sent] = attributeApiActionsToExternalOwner([documentSent], { ...externalOwner, externalOwnerName: ' ' });

    expect(sent).toMatchObject({ name: 'jane@example.com', email: 'jane@example.com' });
  });

  it('leaves envelopes without an external owner unchanged', () => {
    expect(attributeApiActionsToExternalOwner([documentSent], null)).toEqual([documentSent]);
  });
});

describe('buildDelegatedReminderAuditLogs', () => {
  const recipients = [{ id: 7, email: 'signer@example.com', name: 'Sam Signer', role: RecipientRole.SIGNER }];

  it('records a resend reminder for each recipient of a GitLaw-owned envelope', () => {
    const logs = buildDelegatedReminderAuditLogs({
      envelopeId: 'envelope_1',
      documentMeta: externalOwner,
      recipients,
      requestMetadata,
    });

    expect(logs).toEqual([
      expect.objectContaining({
        type: 'EMAIL_SENT',
        envelopeId: 'envelope_1',
        name: 'GitLaw',
        email: null,
        userId: null,
        ipAddress: '10.0.0.1',
        data: { ...recipientData, emailType: 'SIGNING_REQUEST', isResending: true },
      }),
    ]);
  });

  it('records no reminder for a CC recipient, who is never reminded', () => {
    const cc = { ...recipients[0], role: RecipientRole.CC };

    expect(
      buildDelegatedReminderAuditLogs({
        envelopeId: 'envelope_1',
        documentMeta: externalOwner,
        recipients: [cc],
        requestMetadata,
      }),
    ).toEqual([]);
  });

  it('records nothing for an envelope without an external owner, where no one sends the email', () => {
    expect(
      buildDelegatedReminderAuditLogs({ envelopeId: 'envelope_1', documentMeta: null, recipients, requestMetadata }),
    ).toEqual([]);
  });
});
