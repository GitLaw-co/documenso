/**
 * Local PDF rendering test script.
 *
 * Calls renderCertificate and renderAuditLogs directly with synthetic data,
 * merges pages, and writes output PDFs to apps/remix/test-output/ for visual
 * inspection. Covers edge cases: minimal content, many pages, long text,
 * branding disabled.
 *
 * Run from apps/remix/ so fonts and logo resolve correctly:
 *   cd apps/remix && npx tsx ../../packages/lib/server-only/pdf/test-pdf-render.ts
 */
import { PDF } from '@libpdf/core';
import { i18n } from '@lingui/core';
import fs from 'node:fs';
import path from 'node:path';

import { renderAuditLogs } from './render-audit-logs';
import type { AuditLogRecipient } from './render-audit-logs';
import { renderCertificate } from './render-certificate';
import type { CertificateRecipient } from './render-certificate';

// ---------------------------------------------------------------------------
// i18n setup -- activate English with an empty catalog so msg() source
// strings pass through directly.
// ---------------------------------------------------------------------------
i18n.load('en', {});
i18n.activate('en');

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const A4_WIDTH = 595;
const A4_HEIGHT = 842;

const OUTPUT_DIR = path.join(process.cwd(), 'test-output');

// ---------------------------------------------------------------------------
// Mock data factories
// ---------------------------------------------------------------------------

const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

const LONG_USER_AGENT =
  'Mozilla/5.0 (Linux; Android 14; SAMSUNG SM-S928B/S928BXXU2AXK2) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/24.0 Chrome/120.0.6099.144 Mobile Safari/537.36 OPR/80.0.4170.236 (Presto/2.12.423 Version/12.16)';

function makeBaseAuditLog(minutesAgo: number) {
  return {
    createdAt: new Date(Date.now() - minutesAgo * 60_000),
    ipAddress: '192.168.1.' + Math.floor(Math.random() * 255),
    userAgent: USER_AGENT,
  };
}

function makeCertRecipient(
  id: number,
  overrides: Partial<CertificateRecipient> = {},
): CertificateRecipient {
  const base: CertificateRecipient = {
    id,
    name: `Recipient ${id}`,
    email: `recipient${id}@example.com`,
    role: 'SIGNER' as CertificateRecipient['role'],
    rejectionReason: null,
    signingStatus: 'SIGNED' as CertificateRecipient['signingStatus'],
    authLevel: 'None',
    signatureField: {
      id: id,
      secondaryId: `field-${id}`,
      recipientId: id,
      signature: { signatureImageAsBase64: null, typedSignature: `Recipient ${id}` },
    },
    logs: {
      emailed: makeBaseAuditLog(60),
      sent: makeBaseAuditLog(55),
      opened: makeBaseAuditLog(30),
      completed: makeBaseAuditLog(10),
      rejected: null,
    },
  };
  return { ...base, ...overrides };
}

function makeAuditRecipient(
  id: number,
  overrides: Partial<AuditLogRecipient> = {},
): AuditLogRecipient {
  return {
    id,
    name: `Recipient ${id}`,
    email: `recipient${id}@example.com`,
    role: 'SIGNER' as AuditLogRecipient['role'],
    signingStatus: 'SIGNED' as AuditLogRecipient['signingStatus'],
    ...overrides,
  };
}

type AuditLogEntry = {
  id: string;
  createdAt: Date;
  envelopeId: string;
  name?: string | null;
  email?: string | null;
  userId?: number | null;
  userAgent?: string | null;
  ipAddress?: string | null;
  type: string;
  data: Record<string, unknown>;
};

function makeAuditLog(
  idx: number,
  type: string,
  extraData: Record<string, unknown> = {},
  overrides: Partial<AuditLogEntry> = {},
): AuditLogEntry {
  return {
    id: `audit-${idx}`,
    createdAt: new Date(Date.now() - idx * 5 * 60_000),
    envelopeId: 'envelope-1',
    name: 'John Doe',
    email: 'john@example.com',
    userId: 1,
    userAgent: USER_AGENT,
    ipAddress: '10.0.0.' + (idx % 255),
    type,
    data: {
      recipientEmail: 'john@example.com',
      recipientName: 'John Doe',
      recipientId: 1,
      recipientRole: 'SIGNER',
      ...extraData,
    },
    ...overrides,
  };
}

function makeEnvelope() {
  return {
    id: 'envelope-1',
    secondaryId: 'sec-1',
    externalId: null,
    type: 'DOCUMENT' as const,
    createdAt: new Date(Date.now() - 3600_000),
    updatedAt: new Date(),
    deletedAt: null,
    title: 'Test Legal Document - Service Agreement 2026',
    status: 'COMPLETED' as const,
    source: 'DOCUMENT' as const,
    qrToken: null,
    internalVersion: 1,
    useLegacyFieldInsertion: false,
    authOptions: null,
    formValues: null,
    visibility: 'EVERYONE' as const,
    templateType: 'PRIVATE' as const,
    publicTitle: '',
    publicDescription: '',
    templateId: null,
    userId: 1,
    teamId: 1,
    folderId: null,
    documentMetaId: 'meta-1',
    documentMeta: {
      id: 'meta-1',
      subject: 'Please sign this document',
      message: 'Hi, please review and sign the attached document.',
      timezone: 'America/New_York',
      dateFormat: 'yyyy-MM-dd hh:mm a',
      redirectUrl: null,
      signingOrder: 'PARALLEL' as const,
      allowDictateNextSigner: false,
      typedSignatureEnabled: true,
      uploadSignatureEnabled: true,
      drawSignatureEnabled: true,
      language: 'en',
      distributionMethod: 'EMAIL' as const,
      emailSettings: null,
      emailReplyTo: null,
      emailId: null,
      externalOwnerName: null,
      externalOwnerEmail: null,
      envelopeExpirationPeriod: null,
    },
  };
}

const ENVELOPE_OWNER = { name: 'Jane Admin', email: 'admin@gitlaw.co' };

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function writePdf(name: string, pages: Uint8Array[]) {
  const pdfDoc = await PDF.merge(pages, { includeAnnotations: true });
  const bytes = await pdfDoc.save();
  const outPath = path.join(OUTPUT_DIR, name);
  fs.writeFileSync(outPath, bytes);
  const pageCount = pages.length;
  console.log(
    `  ✓ ${name} (${pageCount} page${pageCount === 1 ? '' : 's'}, ${bytes.length} bytes)`,
  );
}

// ---------------------------------------------------------------------------
// Test scenarios
// ---------------------------------------------------------------------------

async function certSingleRecipient() {
  const pages = await renderCertificate({
    recipients: [makeCertRecipient(1)],
    hidePoweredBy: false,
    i18n,
    envelopeOwner: ENVELOPE_OWNER,
    pageWidth: A4_WIDTH,
    pageHeight: A4_HEIGHT,
  });
  await writePdf('cert-single-recipient.pdf', pages);
}

async function certManyRecipients() {
  const recipients = Array.from({ length: 10 }, (_, i) =>
    makeCertRecipient(i + 1, {
      role: (['SIGNER', 'APPROVER', 'VIEWER', 'CC', 'ASSISTANT'] as const)[
        i % 5
      ] as CertificateRecipient['role'],
      signingStatus:
        i < 8
          ? ('SIGNED' as CertificateRecipient['signingStatus'])
          : ('NOT_SIGNED' as CertificateRecipient['signingStatus']),
    }),
  );
  const pages = await renderCertificate({
    recipients,
    hidePoweredBy: false,
    i18n,
    envelopeOwner: ENVELOPE_OWNER,
    pageWidth: A4_WIDTH,
    pageHeight: A4_HEIGHT,
  });
  await writePdf('cert-many-recipients.pdf', pages);
}

async function certNoBranding() {
  const pages = await renderCertificate({
    recipients: [makeCertRecipient(1), makeCertRecipient(2)],
    hidePoweredBy: true,
    i18n,
    envelopeOwner: ENVELOPE_OWNER,
    pageWidth: A4_WIDTH,
    pageHeight: A4_HEIGHT,
  });
  await writePdf('cert-no-branding.pdf', pages);
}

async function auditFewEntries() {
  const auditLogs = [
    makeAuditLog(1, 'DOCUMENT_CREATED', { title: 'Test Document' }),
    makeAuditLog(2, 'DOCUMENT_SENT', {
      recipientEmail: 'recipient1@example.com',
      recipientName: 'Recipient 1',
      recipientId: 1,
    }),
    makeAuditLog(3, 'DOCUMENT_OPENED', {
      recipientEmail: 'recipient1@example.com',
      recipientName: 'Recipient 1',
      recipientId: 1,
    }),
    makeAuditLog(4, 'DOCUMENT_RECIPIENT_COMPLETED', {
      recipientEmail: 'recipient1@example.com',
      recipientName: 'Recipient 1',
      recipientId: 1,
    }),
  ];

  const pages = await renderAuditLogs({
    envelope: makeEnvelope() as Parameters<typeof renderAuditLogs>[0]['envelope'],
    envelopeOwner: ENVELOPE_OWNER,
    envelopeItems: ['Service Agreement.pdf'],
    recipients: [makeAuditRecipient(1)],
    auditLogs: auditLogs as Parameters<typeof renderAuditLogs>[0]['auditLogs'],
    hidePoweredBy: false,
    pageWidth: A4_WIDTH,
    pageHeight: A4_HEIGHT,
    i18n,
  });
  await writePdf('audit-few-entries.pdf', pages);
}

async function auditManyEntries() {
  const types = [
    'DOCUMENT_CREATED',
    'EMAIL_SENT',
    'DOCUMENT_SENT',
    'DOCUMENT_OPENED',
    'DOCUMENT_VIEWED',
    'DOCUMENT_FIELD_INSERTED',
    'DOCUMENT_RECIPIENT_COMPLETED',
    'DOCUMENT_COMPLETED',
  ];

  const auditLogs: AuditLogEntry[] = [];
  for (let i = 0; i < 30; i++) {
    const type = types[i % types.length];
    auditLogs.push(
      makeAuditLog(i, type, {
        recipientEmail: `recipient${(i % 3) + 1}@example.com`,
        recipientName: `Recipient ${(i % 3) + 1}`,
        recipientId: (i % 3) + 1,
        ...(type === 'DOCUMENT_CREATED' ? { title: 'Test Document' } : {}),
        ...(type === 'EMAIL_SENT' ? { emailType: 'SIGNING_REQUEST', isResending: false } : {}),
        ...(type === 'DOCUMENT_FIELD_INSERTED'
          ? {
              fieldId: `field-${i}`,
              fieldRecipientEmail: `recipient${(i % 3) + 1}@example.com`,
              fieldRecipientId: (i % 3) + 1,
              fieldType: 'SIGNATURE',
            }
          : {}),
        ...(type === 'DOCUMENT_COMPLETED' ? { transactionId: `tx-${i}` } : {}),
      }),
    );
  }

  const pages = await renderAuditLogs({
    envelope: makeEnvelope() as Parameters<typeof renderAuditLogs>[0]['envelope'],
    envelopeOwner: ENVELOPE_OWNER,
    envelopeItems: ['Service Agreement.pdf', 'Addendum.pdf'],
    recipients: [
      makeAuditRecipient(1),
      makeAuditRecipient(2, { role: 'APPROVER' as AuditLogRecipient['role'] }),
      makeAuditRecipient(3, { role: 'CC' as AuditLogRecipient['role'] }),
    ],
    auditLogs: auditLogs as Parameters<typeof renderAuditLogs>[0]['auditLogs'],
    hidePoweredBy: false,
    pageWidth: A4_WIDTH,
    pageHeight: A4_HEIGHT,
    i18n,
  });
  await writePdf('audit-many-entries.pdf', pages);
}

async function auditLongText() {
  const longEmail =
    'a-very-long-email-address-that-goes-on-and-on-and-on@extremely-long-domain-name-for-testing-purposes.example.com';
  const auditLogs: AuditLogEntry[] = [];
  for (let i = 0; i < 15; i++) {
    auditLogs.push(
      makeAuditLog(
        i,
        'DOCUMENT_OPENED',
        {
          recipientEmail: longEmail,
          recipientName: 'Dr. Bartholomew Maximilian Worthington III, Esq.',
          recipientId: 1,
        },
        {
          userAgent: LONG_USER_AGENT,
          email: longEmail,
          name: 'Dr. Bartholomew Maximilian Worthington III, Esq.',
        },
      ),
    );
  }

  const pages = await renderAuditLogs({
    envelope: makeEnvelope() as Parameters<typeof renderAuditLogs>[0]['envelope'],
    envelopeOwner: ENVELOPE_OWNER,
    envelopeItems: ['Service Agreement.pdf'],
    recipients: [
      makeAuditRecipient(1, {
        name: 'Dr. Bartholomew Maximilian Worthington III, Esq.',
        email: longEmail,
      }),
    ],
    auditLogs: auditLogs as Parameters<typeof renderAuditLogs>[0]['auditLogs'],
    hidePoweredBy: false,
    pageWidth: A4_WIDTH,
    pageHeight: A4_HEIGHT,
    i18n,
  });
  await writePdf('audit-long-text.pdf', pages);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  console.log('Generating test PDFs...\n');

  await certSingleRecipient();
  await certManyRecipients();
  await certNoBranding();
  await auditFewEntries();
  await auditManyEntries();
  await auditLongText();

  console.log(`\nAll PDFs written to ${OUTPUT_DIR}/`);
  console.log(
    'Open them to visually inspect pagination, footer positioning, and content clipping.',
  );
}

main().catch((err) => {
  console.error('Test script failed:', err);
  process.exit(1);
});
