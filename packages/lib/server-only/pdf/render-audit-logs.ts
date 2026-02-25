import type { I18n } from '@lingui/core';
import { msg } from '@lingui/core/macro';
import type { DocumentMeta } from '@prisma/client';
import type { Envelope, RecipientRole, SigningStatus } from '@prisma/client';
import Konva from 'konva';
import 'konva/skia-backend';
import { DateTime } from 'luxon';
import fs from 'node:fs';
import path from 'node:path';
import type { Canvas } from 'skia-canvas';
import { FontLibrary } from 'skia-canvas';
import { Image as SkiaImage } from 'skia-canvas';
import { match } from 'ts-pattern';
import { P } from 'ts-pattern';

import { DOCUMENT_STATUS } from '../../constants/document';
import { APP_I18N_OPTIONS } from '../../constants/i18n';
import { RECIPIENT_ROLES_DESCRIPTION } from '../../constants/recipient-roles';
import { DOCUMENT_AUDIT_LOG_TYPE } from '../../types/document-audit-logs';
import type { TDocumentAuditLog } from '../../types/document-audit-logs';
import { formatDocumentAuditLogAction } from '../../utils/document-audit-logs';

export type AuditLogRecipient = {
  id: number;
  name: string;
  email: string;
  role: RecipientRole;
  signingStatus?: SigningStatus;
};

type GenerateAuditLogsOptions = {
  envelope: Omit<Envelope, 'completedAt'> & {
    documentMeta: DocumentMeta;
  };
  envelopeItems: string[];
  recipients: AuditLogRecipient[];
  auditLogs: TDocumentAuditLog[];
  hidePoweredBy: boolean;
  pageWidth: number;
  pageHeight: number;
  i18n: I18n;
  envelopeOwner: {
    email: string;
    name: string;
  };
};

const textMutedForeground = '#64748B';
const textSm = 9;
const fontMedium = '500';

const pageTopMargin = 72;
const pageBottomMargin = 15;
const contentMaxWidth = 768;

// Lucide icon SVG path data (24x24 viewBox, stroke-based)
const ICON_PATHS: Record<
  string,
  Array<
    | { type: 'path'; d: string }
    | { type: 'circle'; cx: number; cy: number; r: number }
    | { type: 'rect'; x: number; y: number; width: number; height: number; rx?: number }
  >
> = {
  send: [
    {
      type: 'path',
      d: 'M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z',
    },
    { type: 'path', d: 'm21.854 2.147-10.94 10.939' },
  ],
  eye: [
    {
      type: 'path',
      d: 'M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0',
    },
    { type: 'circle', cx: 12, cy: 12, r: 3 },
  ],
  penLine: [
    { type: 'path', d: 'M13 21h8' },
    {
      type: 'path',
      d: 'M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z',
    },
  ],
  checkCircle: [
    { type: 'path', d: 'M21.801 10A10 10 0 1 1 17 3.335' },
    { type: 'path', d: 'm9 11 3 3L22 4' },
  ],
  xCircle: [
    { type: 'circle', cx: 12, cy: 12, r: 10 },
    { type: 'path', d: 'm15 9-6 6' },
    { type: 'path', d: 'm9 9 6 6' },
  ],
  mail: [
    { type: 'path', d: 'm22 7-8.991 5.727a2 2 0 0 1-2.009 0L2 7' },
    { type: 'rect', x: 2, y: 4, width: 20, height: 16, rx: 2 },
  ],
  fileText: [
    {
      type: 'path',
      d: 'M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z',
    },
    { type: 'path', d: 'M14 2v5a1 1 0 0 0 1 1h5' },
    { type: 'path', d: 'M10 9H8' },
    { type: 'path', d: 'M16 13H8' },
    { type: 'path', d: 'M16 17H8' },
  ],
};

const getAuditLogIconAndLabel = (type: string): { iconKey: string; label: string } =>
  match(type)
    .with(DOCUMENT_AUDIT_LOG_TYPE.DOCUMENT_SENT, () => ({ iconKey: 'send', label: 'SENT' }))
    .with(
      P.union(DOCUMENT_AUDIT_LOG_TYPE.DOCUMENT_OPENED, DOCUMENT_AUDIT_LOG_TYPE.DOCUMENT_VIEWED),
      () => ({ iconKey: 'eye', label: 'VIEWED' }),
    )
    .with(DOCUMENT_AUDIT_LOG_TYPE.DOCUMENT_RECIPIENT_COMPLETED, () => ({
      iconKey: 'penLine',
      label: 'SIGNED',
    }))
    .with(DOCUMENT_AUDIT_LOG_TYPE.DOCUMENT_COMPLETED, () => ({
      iconKey: 'checkCircle',
      label: 'COMPLETED',
    }))
    .with(DOCUMENT_AUDIT_LOG_TYPE.DOCUMENT_RECIPIENT_REJECTED, () => ({
      iconKey: 'xCircle',
      label: 'REJECTED',
    }))
    .with(DOCUMENT_AUDIT_LOG_TYPE.EMAIL_SENT, () => ({ iconKey: 'mail', label: 'EMAIL SENT' }))
    .with(
      P.union(
        DOCUMENT_AUDIT_LOG_TYPE.DOCUMENT_FIELD_INSERTED,
        DOCUMENT_AUDIT_LOG_TYPE.DOCUMENT_FIELD_UNINSERTED,
      ),
      () => ({ iconKey: 'fileText', label: 'FIELD' }),
    )
    .otherwise(() => ({
      iconKey: 'fileText',
      label: type.replace(/_/g, ' ').replace('DOCUMENT ', ''),
    }));

const renderIcon = (iconKey: string, size: number) => {
  const group = new Konva.Group();
  const scale = size / 24;
  const iconParts = ICON_PATHS[iconKey] ?? ICON_PATHS.fileText;
  const strokeColor = '#6b7280';
  const strokeWidth = 1.5 / scale;

  for (const part of iconParts) {
    if (part.type === 'path') {
      const p = new Konva.Path({
        data: part.d,
        stroke: strokeColor,
        strokeWidth,
        fill: '',
        lineCap: 'round',
        lineJoin: 'round',
      });
      group.add(p);
    } else if (part.type === 'circle') {
      const c = new Konva.Circle({
        x: part.cx,
        y: part.cy,
        radius: part.r,
        stroke: strokeColor,
        strokeWidth,
      });
      group.add(c);
    } else if (part.type === 'rect') {
      const r = new Konva.Rect({
        x: part.x,
        y: part.y,
        width: part.width,
        height: part.height,
        cornerRadius: part.rx ?? 0,
        stroke: strokeColor,
        strokeWidth,
      });
      group.add(r);
    }
  }

  group.scaleX(scale);
  group.scaleY(scale);

  return group;
};

const renderPageHeader = ({
  i18n,
  width,
  margin,
}: {
  i18n: I18n;
  width: number;
  margin: number;
}) => {
  const header = new Konva.Group();
  const headerHeight = pageTopMargin;
  const logoHeight = 32;
  const separatorPadding = 8;

  const logoPath = path.join(process.cwd(), 'public/static/logo.png');
  const logo = fs.readFileSync(logoPath);

  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  const img = new SkiaImage(logo) as unknown as HTMLImageElement;

  const logoImage = new Konva.Image({
    image: img,
    x: margin,
    y: (headerHeight - separatorPadding - logoHeight) / 2,
    height: logoHeight,
    width: logoHeight * (img.width / img.height),
  });

  const titleText = new Konva.Text({
    x: margin,
    y: 0,
    width: width - margin * 2,
    height: headerHeight - separatorPadding,
    verticalAlign: 'middle',
    align: 'right',
    text: i18n._(msg`Audit Trail`),
    fontFamily: 'Inter',
    fontSize: 14,
    fontStyle: '300',
    fill: '#4b5563',
  });

  const separator = new Konva.Line({
    points: [
      margin,
      headerHeight - separatorPadding,
      width - margin,
      headerHeight - separatorPadding,
    ],
    stroke: '#e5e7eb',
    strokeWidth: 1,
  });

  header.add(logoImage);
  header.add(titleText);
  header.add(separator);

  return header;
};

type RenderOverviewCardOptions = {
  envelope: Omit<Envelope, 'completedAt'> & {
    documentMeta: DocumentMeta;
  };
  envelopeOwner: {
    email: string;
    name: string;
  };
  recipients: AuditLogRecipient[];
  width: number;
  i18n: I18n;
};

const renderOverviewRow = ({
  label,
  value,
  width,
  y,
}: {
  label: string;
  value: string;
  width: number;
  y: number;
}) => {
  const labelWidth = 130;
  const group = new Konva.Group({ y });

  const labelText = new Konva.Text({
    x: 0,
    y: 0,
    width: labelWidth,
    text: label.toUpperCase(),
    fontFamily: 'Inter',
    fontSize: textSm,
    fontStyle: '600',
    fill: '#4b5563',
  });

  const valueText = new Konva.Text({
    x: labelWidth,
    y: 0,
    width: width - labelWidth,
    text: value,
    fontFamily: 'Inter',
    fontSize: textSm,
    fill: '#111827',
    wrap: 'char',
  });

  group.add(labelText);
  group.add(valueText);

  return group;
};

const deriveEffectiveStatus = (
  envelope: Omit<Envelope, 'completedAt'>,
  recipients: AuditLogRecipient[],
) => {
  let effectiveStatus = envelope.status;

  if (envelope.status === 'PENDING') {
    const signingRecipients = recipients.filter(
      (r) => r.role === 'SIGNER' || r.role === 'APPROVER',
    );
    const allSigned =
      signingRecipients.length > 0 && signingRecipients.every((r) => r.signingStatus === 'SIGNED');
    const anyRejected = recipients.some((r) => r.signingStatus === 'REJECTED');

    if (anyRejected) {
      effectiveStatus = 'REJECTED';
    } else if (allSigned) {
      effectiveStatus = 'COMPLETED';
    }
  }

  return effectiveStatus;
};

const renderOverviewCard = (options: RenderOverviewCardOptions) => {
  const { envelope, envelopeOwner, recipients, width, i18n } = options;
  const rowSpacing = 10;

  const overviewCard = new Konva.Group();
  let currentY = 0;

  const titleRow = renderOverviewRow({
    label: i18n._(msg`Title`),
    value: envelope.title,
    width,
    y: currentY,
  });
  overviewCard.add(titleRow);
  currentY = overviewCard.getClientRect().height + rowSpacing;

  const docIdRow = renderOverviewRow({
    label: i18n._(msg`Document ID`),
    value: envelope.id,
    width,
    y: currentY,
  });
  overviewCard.add(docIdRow);
  currentY = overviewCard.getClientRect().height + rowSpacing;

  const ownerText = envelopeOwner.email
    ? `${envelopeOwner.name} (${envelopeOwner.email})`
    : envelopeOwner.name;
  const ownerRow = renderOverviewRow({
    label: i18n._(msg`Owner`),
    value: ownerText,
    width,
    y: currentY,
  });
  overviewCard.add(ownerRow);
  currentY = overviewCard.getClientRect().height + rowSpacing;

  const effectiveStatus = deriveEffectiveStatus(envelope, recipients);
  const statusDescription = i18n._(
    envelope.deletedAt ? msg`Deleted` : DOCUMENT_STATUS[effectiveStatus].description,
  );

  const statusGroup = new Konva.Group({ y: currentY });
  const statusLabelText = new Konva.Text({
    x: 0,
    y: 0,
    width: 130,
    text: i18n._(msg`Status`).toUpperCase(),
    fontFamily: 'Inter',
    fontSize: textSm,
    fontStyle: '600',
    fill: '#4b5563',
  });
  const statusDot = new Konva.Circle({
    x: 134,
    y: 5,
    radius: 3,
    fill: '#22c55e',
  });
  const statusValueText = new Konva.Text({
    x: 142,
    y: 0,
    text: statusDescription,
    fontFamily: 'Inter',
    fontSize: textSm,
    fill: '#111827',
  });
  statusGroup.add(statusLabelText);
  statusGroup.add(statusDot);
  statusGroup.add(statusValueText);
  overviewCard.add(statusGroup);
  currentY = overviewCard.getClientRect().height + rowSpacing;

  const recipientsText = recipients
    .map((r) => `[${i18n._(RECIPIENT_ROLES_DESCRIPTION[r.role].roleName)}] ${r.name} (${r.email})`)
    .join(', ');
  const recipientsRow = renderOverviewRow({
    label: i18n._(msg`Recipients`),
    value: recipientsText,
    width,
    y: currentY,
  });
  overviewCard.add(recipientsRow);

  return overviewCard;
};

// HelloSign-style 3-column grid layout for audit log entries
const col1Width = 80;
const col2Width = 120;

type RenderRowOptions = {
  auditLog: TDocumentAuditLog;
  width: number;
  i18n: I18n;
};

const renderRow = (options: RenderRowOptions) => {
  const { auditLog, width, i18n } = options;
  const col3Width = width - col1Width - col2Width;
  const { iconKey, label } = getAuditLogIconAndLabel(auditLog.type);

  const rowGroup = new Konva.Group();
  const rowPaddingY = 12;

  // Column 1: Icon + Type label (centered)
  const col1Group = new Konva.Group({ x: 0, y: rowPaddingY });
  const iconGroup = renderIcon(iconKey, 16);
  iconGroup.setAttrs({ x: (col1Width - 16) / 2, y: 0 });
  col1Group.add(iconGroup);

  const typeLabel = new Konva.Text({
    x: 0,
    y: 20,
    width: col1Width,
    align: 'center',
    text: label,
    fontFamily: 'Inter',
    fontSize: 7,
    fontStyle: '600',
    letterSpacing: 0.5,
    fill: '#4b5563',
  });
  col1Group.add(typeLabel);
  rowGroup.add(col1Group);

  // Column 2: Date + Time
  const col2Group = new Konva.Group({ x: col1Width, y: rowPaddingY });
  const dateTime = DateTime.fromJSDate(auditLog.createdAt).setLocale(
    APP_I18N_OPTIONS.defaultLocale,
  );
  const dateText = new Konva.Text({
    x: 0,
    y: 0,
    text: dateTime.toFormat('MM / dd / yyyy'),
    fontFamily: 'Inter',
    fontSize: textSm,
    fontStyle: '600',
    fill: '#111827',
  });
  const timeText = new Konva.Text({
    x: 0,
    y: dateText.height() + 2,
    text: `${dateTime.toFormat('HH:mm:ss')} UTC`,
    fontFamily: 'Inter',
    fontSize: textSm,
    fill: '#4b5563',
  });
  col2Group.add(dateText);
  col2Group.add(timeText);
  rowGroup.add(col2Group);

  // Column 3: Description + IP
  const col3Group = new Konva.Group({ x: col1Width + col2Width, y: rowPaddingY });
  const descriptionText = new Konva.Text({
    x: 0,
    y: 0,
    width: col3Width,
    text: formatDocumentAuditLogAction(i18n, auditLog).description,
    fontFamily: 'Inter',
    fontSize: textSm,
    fill: '#111827',
    wrap: 'word',
  });
  col3Group.add(descriptionText);

  if (auditLog.ipAddress) {
    const ipText = new Konva.Text({
      x: 0,
      y: descriptionText.height() + 4,
      text: `IP: ${auditLog.ipAddress}`,
      fontFamily: 'Inter',
      fontSize: textSm,
      fill: '#4b5563',
    });
    col3Group.add(ipText);
  }
  rowGroup.add(col3Group);

  // Bottom padding
  const bottomPad = new Konva.Rect({
    x: 0,
    y: rowGroup.getClientRect().height + rowPaddingY,
    width: 1,
    height: 1,
  });
  rowGroup.add(bottomPad);

  return rowGroup;
};

const renderBranding = ({ i18n }: { i18n: I18n }) => {
  const branding = new Konva.Group();

  const brandingLogoHeight = 20;

  const text = new Konva.Text({
    x: 0,
    verticalAlign: 'middle',
    text: i18n._(msg`Powered by`),
    fontStyle: fontMedium,
    fontFamily: 'Inter',
    fontSize: textSm,
    height: brandingLogoHeight,
    fill: textMutedForeground,
  });

  const logoPath = path.join(process.cwd(), 'public/static/logo.png');
  const logo = fs.readFileSync(logoPath);

  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  const img = new SkiaImage(logo) as unknown as HTMLImageElement;

  const logoImage = new Konva.Image({
    image: img,
    height: brandingLogoHeight,
    width: brandingLogoHeight * (img.width / img.height),
    x: text.width() + 8,
  });

  branding.add(text);
  branding.add(logoImage);
  return branding;
};

type GroupRowsIntoPagesOptions = {
  auditLogs: TDocumentAuditLog[];
  maxHeight: number;
  contentWidth: number;
  i18n: I18n;
  overviewCard: Konva.Group;
};

const groupRowsIntoPages = (options: GroupRowsIntoPagesOptions) => {
  const { auditLogs, maxHeight, contentWidth, i18n, overviewCard } = options;

  const groupedRows: Konva.Group[][] = [[]];

  const overviewCardHeight = overviewCard.getClientRect().height;
  const sectionTitleHeight = 30;

  // First page has header + overview card + "Document History" title
  let availableHeight = maxHeight - pageTopMargin - overviewCardHeight - sectionTitleHeight - 20;
  let currentGroupedRowIndex = 0;

  for (const auditLog of auditLogs) {
    const row = renderRow({ auditLog, width: contentWidth, i18n });

    const rowHeight = row.getClientRect().height;

    if (rowHeight > availableHeight) {
      currentGroupedRowIndex++;
      groupedRows[currentGroupedRowIndex] = [row];
      availableHeight = maxHeight - pageTopMargin;
    } else {
      groupedRows[currentGroupedRowIndex].push(row);
    }

    availableHeight -= rowHeight;
  }

  return groupedRows;
};

type RenderPagesOptions = {
  groupedRows: Konva.Group[][];
  margin: number;
  pageWidth: number;
  i18n: I18n;
  overviewCard: Konva.Group;
};

const renderPages = (options: RenderPagesOptions) => {
  const { groupedRows, margin, pageWidth, i18n, overviewCard } = options;

  const pages: Konva.Group[] = [];

  for (const [pageIndex, rows] of groupedRows.entries()) {
    const pageGroup = new Konva.Group();

    const pageHeader = renderPageHeader({ i18n, width: pageWidth, margin });
    pageGroup.add(pageHeader);

    if (pageIndex === 0) {
      overviewCard.setAttrs({
        x: margin,
        y: pageTopMargin + 8,
      });
      pageGroup.add(overviewCard);

      const historyTitle = new Konva.Text({
        x: margin,
        y: pageGroup.getClientRect().height + 20,
        text: i18n._(msg`Document History`),
        fontFamily: 'Inter',
        fontSize: 12,
        fontStyle: fontMedium,
        fill: '#374151',
      });
      pageGroup.add(historyTitle);
    }

    for (const [rowIndex, row] of rows.entries()) {
      const currentY = pageGroup.getClientRect().height;

      if (rowIndex > 0) {
        const divider = new Konva.Line({
          points: [margin, currentY, pageWidth - margin, currentY],
          stroke: '#f3f4f6',
          strokeWidth: 1,
        });
        pageGroup.add(divider);
      }

      row.setAttrs({
        x: margin,
        y: currentY,
      });
      pageGroup.add(row);
    }

    pages.push(pageGroup);
  }

  return pages;
};

export async function renderAuditLogs({
  envelope,
  envelopeOwner,
  envelopeItems: _envelopeItems,
  recipients,
  auditLogs,
  pageWidth,
  pageHeight,
  i18n,
  hidePoweredBy,
}: GenerateAuditLogsOptions) {
  const fontPath = path.join(process.cwd(), 'public/fonts');

  // eslint-disable-next-line react-hooks/rules-of-hooks
  FontLibrary.use({
    Caveat: [path.join(fontPath, 'caveat.ttf')],
    Inter: [path.join(fontPath, 'inter-variablefont_opsz,wght.ttf')],
  });

  const minimumMargin = 10;

  const contentWidth = Math.min(pageWidth - minimumMargin * 2, contentMaxWidth);
  const margin = (pageWidth - contentWidth) / 2;

  let stage: Konva.Stage | null = new Konva.Stage({ width: pageWidth, height: pageHeight });

  const overviewCard = renderOverviewCard({
    envelope,
    envelopeOwner,
    recipients,
    width: contentWidth,
    i18n,
  });

  const groupedRows = groupRowsIntoPages({
    auditLogs,
    maxHeight: pageHeight,
    contentWidth,
    i18n,
    overviewCard,
  });

  const pageGroups = renderPages({
    groupedRows,
    margin,
    pageWidth,
    i18n,
    overviewCard,
  });

  const brandingGroup = renderBranding({ i18n });
  const brandingRect = brandingGroup.getClientRect();
  const brandingTopPadding = 24;

  const pages: Uint8Array[] = [];

  let isBrandingPlaced = false;

  for (const [index, pageGroup] of pageGroups.entries()) {
    stage.destroyChildren();
    const page = new Konva.Layer();

    page.add(pageGroup);

    if (index === pageGroups.length - 1 && !hidePoweredBy) {
      const separatorHeight = 1;
      const separatorPaddingBelow = 16;
      const totalBrandingHeight = brandingRect.height + separatorHeight + separatorPaddingBelow;
      const remainingHeight = pageHeight - pageGroup.getClientRect().height - pageBottomMargin;

      if (totalBrandingHeight <= remainingHeight) {
        const brandingY = pageHeight - pageBottomMargin - brandingRect.height;
        const separatorY = brandingY - separatorPaddingBelow;

        const footerSeparator = new Konva.Line({
          points: [margin, separatorY, pageWidth - margin, separatorY],
          stroke: '#e5e7eb',
          strokeWidth: separatorHeight,
        });
        page.add(footerSeparator);

        brandingGroup.setAttrs({
          x: pageWidth - brandingRect.width - margin,
          y: brandingY,
        } satisfies Partial<Konva.GroupConfig>);

        page.add(brandingGroup);
        isBrandingPlaced = true;
      }
    }

    stage.add(page);

    const canvas = page.canvas._canvas as unknown as Canvas; // eslint-disable-line @typescript-eslint/consistent-type-assertions
    const buffer = await canvas.toBuffer('pdf');
    pages.push(new Uint8Array(buffer));
  }

  if (!hidePoweredBy && !isBrandingPlaced) {
    stage.destroyChildren();
    const page = new Konva.Layer();

    brandingGroup.setAttrs({
      x: pageWidth - brandingRect.width - margin,
      y: pageTopMargin,
    } satisfies Partial<Konva.GroupConfig>);

    page.add(brandingGroup);
    stage.add(page);

    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    const canvas = page.canvas._canvas as unknown as Canvas;
    const buffer = await canvas.toBuffer('pdf');

    pages.push(new Uint8Array(buffer));
  }

  stage.destroy();
  stage = null;

  return pages;
}
