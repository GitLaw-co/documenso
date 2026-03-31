import { Trans } from '@lingui/react/macro';
import { DocumentStatus, FieldType, RecipientRole } from '@prisma/client';
import { match } from 'ts-pattern';

import { getOptionalSession } from '@documenso/auth/server/lib/utils/get-session';
import { GITLAW_HOME_URL } from '@documenso/lib/constants/app';
import { getDocumentAndSenderByToken } from '@documenso/lib/server-only/document/get-document-by-token';
import { isRecipientAuthorized } from '@documenso/lib/server-only/document/is-recipient-authorized';
import { getFieldsForToken } from '@documenso/lib/server-only/field/get-fields-for-token';
import { getRecipientByToken } from '@documenso/lib/server-only/recipient/get-recipient-by-token';
import { getRecipientSignatures } from '@documenso/lib/server-only/recipient/get-recipient-signatures';
import { isDocumentCompleted } from '@documenso/lib/utils/document';
import { trpc } from '@documenso/trpc/react';
import { cn } from '@documenso/ui/lib/utils';

import { EnvelopeDownloadDialog } from '~/components/dialogs/envelope-download-dialog';
import { BrandingLogo } from '~/components/general/branding-logo';
import { DocumentSigningAuthPageView } from '~/components/general/document-signing/document-signing-auth-page';

import type { Route } from './+types/complete';

export async function loader({ params, request }: Route.LoaderArgs) {
  const { user } = await getOptionalSession(request);

  const { token } = params;

  if (!token) {
    throw new Response('Not Found', { status: 404 });
  }

  const document = await getDocumentAndSenderByToken({
    token,
    requireAccessAuth: false,
  }).catch(() => null);

  if (!document || !document.documentData) {
    throw new Response('Not Found', { status: 404 });
  }

  const [fields, recipient] = await Promise.all([
    getFieldsForToken({ token }),
    getRecipientByToken({ token }).catch(() => null),
  ]);

  if (!recipient) {
    throw new Response('Not Found', { status: 404 });
  }

  const isDocumentAccessValid = await isRecipientAuthorized({
    type: 'ACCESS',
    documentAuthOptions: document.authOptions,
    recipient,
    userId: user?.id,
  });

  if (!isDocumentAccessValid) {
    return {
      isDocumentAccessValid: false,
      recipientEmail: recipient.email,
    } as const;
  }

  const signatures = await getRecipientSignatures({ recipientId: recipient.id });

  const recipientName =
    recipient.name ||
    fields.find((field) => field.type === FieldType.NAME)?.customText ||
    recipient.email;

  return {
    isDocumentAccessValid: true,
    recipientName,
    recipientEmail: recipient.email,
    signatures,
    document,
    recipient,
  };
}

type StepProps = {
  title: React.ReactNode;
  description: React.ReactNode;
  isLast?: boolean;
};

function Step({ title, description, isLast }: StepProps) {
  return (
    <div className="flex gap-4">
      <div className="flex flex-col items-center">
        <div className="h-3 w-3 rounded-full bg-white" />
        {!isLast && <div className="w-0.5 flex-1 bg-white/50" />}
      </div>
      <div className={cn('pb-8', isLast && 'pb-0')}>
        <p className="text-lg font-bold leading-tight text-white md:text-xl">{title}</p>
        <p className="mt-1 text-sm text-white/70 md:text-base">{description}</p>
      </div>
    </div>
  );
}

export default function CompletedSigningPage({ loaderData }: Route.ComponentProps) {
  const { isDocumentAccessValid, document, recipient, recipientEmail } = loaderData;

  // Poll signing status every few seconds
  const { data: signingStatusData } = trpc.envelope.signingStatus.useQuery(
    {
      token: recipient?.token || '',
    },
    {
      refetchInterval: 3000,
      initialData: match(document?.status)
        .with(DocumentStatus.COMPLETED, () => ({ status: 'COMPLETED' }) as const)
        .with(DocumentStatus.REJECTED, () => ({ status: 'REJECTED' }) as const)
        .with(DocumentStatus.PENDING, () => ({ status: 'PENDING' }) as const)
        .otherwise(() => ({ status: 'PENDING' }) as const),
    },
  );

  const signingStatus = signingStatusData?.status ?? 'PENDING';

  if (!isDocumentAccessValid) {
    return <DocumentSigningAuthPageView email={recipientEmail} />;
  }

  const roleLabel = match(recipient.role)
    .with(RecipientRole.SIGNER, () => <Trans>Signed successfully!</Trans>)
    .with(RecipientRole.VIEWER, () => <Trans>Viewed successfully!</Trans>)
    .with(RecipientRole.APPROVER, () => <Trans>Approved successfully!</Trans>)
    .otherwise(() => <Trans>Signed successfully!</Trans>);

  const doneDescription = match({ status: signingStatus, deletedAt: document.deletedAt })
    .with({ status: 'COMPLETED' }, () => (
      <span>
        <Trans>Document is fully signed and distributed</Trans>
        {isDocumentCompleted(document) && (
          <>
            {' '}
            <EnvelopeDownloadDialog
              envelopeId={document.envelopeId}
              envelopeStatus={document.status}
              envelopeItems={document.envelopeItems}
              token={recipient?.token}
              trigger={
                <button type="button" className="font-medium text-white underline">
                  <Trans>Download</Trans>
                </button>
              }
            />
          </>
        )}
      </span>
    ))
    .with({ status: 'PROCESSING' }, () => <Trans>Document is being processed</Trans>)
    .with({ deletedAt: null }, () => <Trans>Waiting for others to complete signing</Trans>)
    .otherwise(() => <Trans>Document is no longer available</Trans>);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-primary px-6 py-16">
      <div className="w-full max-w-md">
        <BrandingLogo className="mb-8 text-white" />
        <h1 className="mb-12 text-4xl font-light italic leading-tight text-white md:text-5xl">
          {roleLabel}
        </h1>

        <div className="mb-12">
          <Step
            title={<Trans>Got signature request</Trans>}
            description={<Trans>Awaiting your signature</Trans>}
          />
          <Step
            title={match(recipient.role)
              .with(RecipientRole.SIGNER, () => <Trans>Signed</Trans>)
              .with(RecipientRole.VIEWER, () => <Trans>Viewed</Trans>)
              .with(RecipientRole.APPROVER, () => <Trans>Approved</Trans>)
              .otherwise(() => (
                <Trans>Signed</Trans>
              ))}
            description={match(recipient.role)
              .with(RecipientRole.SIGNER, () => <Trans>Your signature has been added</Trans>)
              .with(RecipientRole.VIEWER, () => <Trans>Document has been viewed</Trans>)
              .with(RecipientRole.APPROVER, () => <Trans>Your approval has been recorded</Trans>)
              .otherwise(() => (
                <Trans>Your signature has been added</Trans>
              ))}
          />
          <Step title={<Trans>Done</Trans>} description={doneDescription} isLast />
        </div>

        <a
          href={GITLAW_HOME_URL()}
          className="block w-full rounded-lg bg-white py-3.5 text-center text-base font-medium text-primary"
        >
          <Trans>Explore GitLaw</Trans>
        </a>
      </div>
    </div>
  );
}
