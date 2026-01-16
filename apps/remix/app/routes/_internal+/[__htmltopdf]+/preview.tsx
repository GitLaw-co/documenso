import { msg } from '@lingui/core/macro';
import { useLingui } from '@lingui/react';
import { DocumentStatus, RecipientRole } from '@prisma/client';

import { DOCUMENT_STATUS } from '@documenso/lib/constants/document';
import { RECIPIENT_ROLES_DESCRIPTION } from '@documenso/lib/constants/recipient-roles';
import {
  DOCUMENT_AUDIT_LOG_TYPE,
  type TDocumentAuditLog,
} from '@documenso/lib/types/document-audit-logs';

import { BrandingLogo } from '~/components/general/branding-logo';
import { InternalAuditLogTable } from '~/components/tables/internal-audit-log-table';

/**
 * DEV ONLY: Preview route for certificate and audit log styling
 * Access at: /__htmltopdf/preview
 */
export default function Preview() {
  const { _ } = useLingui();

  // Mock document data
  const document = {
    title: 'Sample Partnership Agreement.pdf',
    envelopeId: 'envelope_abc123xyz789',
    status: DocumentStatus.COMPLETED,
    deletedAt: null,
    user: {
      name: 'John Smith',
      email: 'john@example.com',
    },
    recipients: [
      { id: 1, name: 'John Smith', email: 'john@example.com', role: RecipientRole.SIGNER },
      { id: 2, name: 'Jane Doe', email: 'jane@example.com', role: RecipientRole.SIGNER },
    ],
  };

  // Mock audit logs (in chronological order - oldest first)
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  const mockLogs = [
    {
      id: '1',
      documentId: 1,
      createdAt: new Date('2026-01-15T10:00:00Z'),
      type: DOCUMENT_AUDIT_LOG_TYPE.DOCUMENT_SENT,
      ipAddress: '192.168.1.100',
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/120.0.0.0',
      email: 'john@example.com',
      name: 'John Smith',
      userId: 1,
      data: {},
    },
    {
      id: '2',
      documentId: 1,
      createdAt: new Date('2026-01-15T10:05:00Z'),
      type: DOCUMENT_AUDIT_LOG_TYPE.DOCUMENT_OPENED,
      ipAddress: '192.168.1.101',
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Safari/17.0',
      email: 'jane@example.com',
      name: 'Jane Doe',
      userId: 2,
      data: {},
    },
    {
      id: '3',
      documentId: 1,
      createdAt: new Date('2026-01-15T10:06:00Z'),
      type: DOCUMENT_AUDIT_LOG_TYPE.DOCUMENT_RECIPIENT_COMPLETED,
      ipAddress: '192.168.1.101',
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Safari/17.0',
      email: 'jane@example.com',
      name: 'Jane Doe',
      userId: 2,
      data: {},
    },
    {
      id: '4',
      documentId: 1,
      createdAt: new Date('2026-01-15T10:30:00Z'),
      type: DOCUMENT_AUDIT_LOG_TYPE.DOCUMENT_OPENED,
      ipAddress: '192.168.1.100',
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/120.0.0.0',
      email: 'john@example.com',
      name: 'John Smith',
      userId: 1,
      data: {},
    },
    {
      id: '5',
      documentId: 1,
      createdAt: new Date('2026-01-15T10:31:00Z'),
      type: DOCUMENT_AUDIT_LOG_TYPE.DOCUMENT_RECIPIENT_COMPLETED,
      ipAddress: '192.168.1.100',
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/120.0.0.0',
      email: 'john@example.com',
      name: 'John Smith',
      userId: 1,
      data: {},
    },
    {
      id: '6',
      documentId: 1,
      createdAt: new Date('2026-01-15T10:31:00Z'),
      type: DOCUMENT_AUDIT_LOG_TYPE.DOCUMENT_COMPLETED,
      ipAddress: null,
      userAgent: null,
      email: null,
      name: null,
      userId: null,
      data: {},
    },
  ] as TDocumentAuditLog[];

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      {/* AUDIT LOG PREVIEW */}
      <div className="mx-auto mb-12 max-w-screen-md">
        <h2 className="mb-4 text-center text-sm font-bold uppercase tracking-wide text-gray-500">
          Audit Log Preview
        </h2>
        <div className="bg-white p-8 shadow">
          <div className="mb-6 flex items-center justify-between border-b pb-4">
            <BrandingLogo className="h-8" />
            <h1 className="text-2xl font-light text-gray-600">{_(msg`Audit Trail`)}</h1>
          </div>

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
                {document.user.name} ({document.user.email})
              </span>
            </div>

            <div className="flex">
              <span className="w-48 font-semibold uppercase text-gray-600">{_(msg`Status`)}</span>
              <span className="flex items-center gap-2 text-gray-900">
                <span className="h-2 w-2 rounded-full bg-green-500" />
                {_(DOCUMENT_STATUS[document.status].description)}
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
            <InternalAuditLogTable logs={mockLogs} />
          </div>

          <div className="my-8 border-t pt-4">
            <div className="flex items-center gap-x-2 text-sm text-gray-500">
              <span>{_(msg`Powered by`)}</span>
              <BrandingLogo className="h-5" />
            </div>
          </div>
        </div>
      </div>

      {/* SIGNING CERTIFICATE PREVIEW */}
      <div className="mx-auto max-w-screen-md">
        <h2 className="mb-4 text-center text-sm font-bold uppercase tracking-wide text-gray-500">
          Signing Certificate Preview
        </h2>
        <div className="bg-white p-8 shadow">
          <div className="mb-8 flex items-center justify-between border-b pb-4">
            <BrandingLogo className="h-8" />
            <h1 className="text-2xl font-light text-gray-600">{_(msg`Signing Certificate`)}</h1>
          </div>

          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="pb-4 text-left font-semibold">{_(msg`Signer Events`)}</th>
                <th className="pb-4 text-left font-semibold">{_(msg`Signature`)}</th>
                <th className="pb-4 text-left font-semibold">{_(msg`Details`)}</th>
              </tr>
            </thead>
            <tbody>
              {document.recipients.map((recipient, i) => (
                <tr key={i} className="border-b last:border-b-0">
                  <td className="py-4 align-top">
                    <div className="font-medium">{recipient.name}</div>
                    <div className="text-gray-600">{recipient.email}</div>
                    <p className="mt-2 text-gray-500">
                      {_(RECIPIENT_ROLES_DESCRIPTION[recipient.role].roleName)}
                    </p>
                    <p className="mt-2 text-gray-500">
                      <span className="font-medium">{_(msg`Authentication Level`)}:</span>
                      <span className="block">{_(msg`Email`)}</span>
                    </p>
                  </td>
                  <td className="py-4 align-top">
                    <div className="inline-block rounded-lg border border-gray-300 bg-white p-2">
                      <p className="text-center font-signature text-lg italic">{recipient.name}</p>
                    </div>
                    <p className="mt-2 text-gray-500">
                      <span className="font-medium">{_(msg`Signature ID`)}:</span>
                      <span className="block font-mono uppercase">SIG{i + 1}ABC123XYZ</span>
                    </p>
                    <p className="mt-2 text-gray-500">
                      <span className="font-medium">{_(msg`IP Address`)}:</span>
                      <span className="ml-1">192.168.1.10{i}</span>
                    </p>
                    <p className="mt-1 text-gray-500">
                      <span className="font-medium">{_(msg`Device`)}:</span>
                      <span className="ml-1">Mac OS - Chrome 120.0.0.0</span>
                    </p>
                  </td>
                  <td className="py-4 align-top">
                    <div className="space-y-1 text-gray-500">
                      <p>
                        <span className="font-medium">{_(msg`Sent`)}:</span>
                        <span className="ml-1">2026-01-15 10:00:00 AM (UTC)</span>
                      </p>
                      <p>
                        <span className="font-medium">{_(msg`Viewed`)}:</span>
                        <span className="ml-1">2026-01-15 10:0{i}:00 AM (UTC)</span>
                      </p>
                      <p>
                        <span className="font-medium">{_(msg`Signed`)}:</span>
                        <span className="ml-1">2026-01-15 10:0{i + 1}:00 AM (UTC)</span>
                      </p>
                      <p>
                        <span className="font-medium">{_(msg`Reason`)}:</span>
                        <span className="ml-1">{_(msg`I am a signer of this document`)}</span>
                      </p>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="my-8 border-t pt-4">
            <div className="flex items-center gap-x-2 text-sm text-gray-500">
              <span>{_(msg`Signing certificate provided by`)}</span>
              <BrandingLogo className="h-5" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
