import { useLingui } from '@lingui/react';
import { CheckCircle, Eye, FileText, Mail, PenLine, Send, XCircle } from 'lucide-react';
import { DateTime } from 'luxon';
import { P, match } from 'ts-pattern';

import { APP_I18N_OPTIONS } from '@documenso/lib/constants/i18n';
import {
  DOCUMENT_AUDIT_LOG_TYPE,
  type TDocumentAuditLog,
} from '@documenso/lib/types/document-audit-logs';
import { formatDocumentAuditLogAction } from '@documenso/lib/utils/document-audit-logs';

export type AuditLogDataTableProps = {
  logs: TDocumentAuditLog[];
};

/**
 * Get icon and label for the audit log type (HelloSign style)
 */
const getAuditLogIcon = (type: string) =>
  match(type)
    .with(DOCUMENT_AUDIT_LOG_TYPE.DOCUMENT_SENT, () => ({
      icon: Send,
      label: 'SENT',
    }))
    .with(
      P.union(DOCUMENT_AUDIT_LOG_TYPE.DOCUMENT_OPENED, DOCUMENT_AUDIT_LOG_TYPE.DOCUMENT_VIEWED),
      () => ({
        icon: Eye,
        label: 'VIEWED',
      }),
    )
    .with(DOCUMENT_AUDIT_LOG_TYPE.DOCUMENT_RECIPIENT_COMPLETED, () => ({
      icon: PenLine,
      label: 'SIGNED',
    }))
    .with(DOCUMENT_AUDIT_LOG_TYPE.DOCUMENT_COMPLETED, () => ({
      icon: CheckCircle,
      label: 'COMPLETED',
    }))
    .with(DOCUMENT_AUDIT_LOG_TYPE.DOCUMENT_RECIPIENT_REJECTED, () => ({
      icon: XCircle,
      label: 'REJECTED',
    }))
    .with(DOCUMENT_AUDIT_LOG_TYPE.EMAIL_SENT, () => ({
      icon: Mail,
      label: 'EMAIL SENT',
    }))
    .with(
      P.union(
        DOCUMENT_AUDIT_LOG_TYPE.DOCUMENT_FIELD_INSERTED,
        DOCUMENT_AUDIT_LOG_TYPE.DOCUMENT_FIELD_UNINSERTED,
      ),
      () => ({
        icon: FileText,
        label: 'FIELD',
      }),
    )
    .otherwise(() => ({
      icon: FileText,
      label: type.replace(/_/g, ' ').replace('DOCUMENT ', ''),
    }));

/**
 * DO NOT USE TRANS. YOU MUST USE _ FOR THIS FILE AND ALL CHILDREN COMPONENTS.
 */
export const InternalAuditLogTable = ({ logs }: AuditLogDataTableProps) => {
  const { _ } = useLingui();

  return (
    <div className="divide-y divide-gray-100">
      {logs.map((log, index) => {
        const formattedAction = formatDocumentAuditLogAction(_, log);
        const { icon: Icon, label } = getAuditLogIcon(log.type);
        const dateTime = DateTime.fromJSDate(log.createdAt).setLocale(
          APP_I18N_OPTIONS.defaultLocale,
        );

        return (
          <div
            key={index}
            className="grid grid-cols-[100px_140px_1fr] gap-4 py-6 first:pt-0"
            style={{
              pageBreakInside: 'avoid',
              breakInside: 'avoid',
            }}
          >
            {/* Column 1: Icon + Event Type */}
            <div className="flex flex-col items-center text-center">
              <Icon className="mb-1 h-6 w-6 text-gray-500" strokeWidth={1.5} />
              <span className="text-xs font-semibold uppercase tracking-wide text-gray-600">
                {label}
              </span>
            </div>

            {/* Column 2: Date + Time */}
            <div className="text-sm">
              <div className="font-semibold text-gray-900">
                {dateTime.toFormat('MM / dd / yyyy')}
              </div>
              <div className="text-gray-600">{dateTime.toFormat('HH:mm:ss')} UTC</div>
            </div>

            {/* Column 3: Description + IP */}
            <div className="text-sm">
              <div className="text-gray-900">{formattedAction.description}</div>
              {log.ipAddress && <div className="mt-1 text-gray-600">IP: {log.ipAddress}</div>}
            </div>
          </div>
        );
      })}
    </div>
  );
};
