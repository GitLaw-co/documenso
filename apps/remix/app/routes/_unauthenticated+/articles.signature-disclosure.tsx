import { Trans } from '@lingui/react/macro';

import { GITLAW_HOME_URL } from '@documenso/lib/constants/app';
import { Button } from '@documenso/ui/primitives/button';

const GITLAW_SUPPORT_EMAIL = 'support@git.law';

export default function SignatureDisclosure() {
  return (
    <div>
      <article className="prose dark:prose-invert">
        <h1>
          <Trans>Electronic Records & Signatures Disclosure</Trans>
        </h1>

        <p className="text-muted-foreground">
          <Trans>Last updated: 9th January 2026</Trans>
        </p>

        <p>
          <Trans>
            This disclosure explains how electronic records and electronic signatures work on
            GitLaw. Please read it carefully before signing.
          </Trans>
        </p>

        <h2>
          <Trans>1. Consent to Electronic Records & Signatures</Trans>
        </h2>
        <p>
          <Trans>
            By clicking "Agree", "Sign", or otherwise proceeding to sign a document on GitLaw, you
            consent for this document to:
          </Trans>
        </p>
        <ul>
          <li>
            <Trans>receive records and disclosures electronically; and</Trans>
          </li>
          <li>
            <Trans>sign documents using electronic signatures.</Trans>
          </li>
        </ul>

        <h2>
          <Trans>2. Legal Effect</Trans>
        </h2>
        <p>
          <Trans>
            Electronic signatures on GitLaw are legally binding and have the same legal effect as
            handwritten signatures, including under:
          </Trans>
        </p>
        <ul>
          <li>
            <Trans>
              the U.S. Electronic Signatures in Global and National Commerce Act (E-SIGN); and
            </Trans>
          </li>
          <li>
            <Trans>applicable electronic signature laws in the UK and EU (including eIDAS).</Trans>
          </li>
        </ul>

        <h2>
          <Trans>3. System Requirements</Trans>
        </h2>
        <p>
          <Trans>To use electronic signatures on GitLaw, you must have:</Trans>
        </p>
        <ul>
          <li>
            <Trans>a device with internet access;</Trans>
          </li>
          <li>
            <Trans>a valid email address;</Trans>
          </li>
          <li>
            <Trans>software capable of viewing PDF or similar documents; and</Trans>
          </li>
          <li>
            <Trans>the ability to download or print documents for your records.</Trans>
          </li>
        </ul>

        <h2>
          <Trans>4. Receiving & Retaining Documents</Trans>
        </h2>
        <ul>
          <li>
            <Trans>
              Documents will be provided to you electronically through GitLaw or by email.
            </Trans>
          </li>
          <li>
            <Trans>You can view, download, and print signed documents at no cost.</Trans>
          </li>
          <li>
            <Trans>
              GitLaw will retain signed documents and make them available to you electronically for
              future access.
            </Trans>
          </li>
        </ul>

        <h2>
          <Trans>5. Paper Copies</Trans>
        </h2>
        <ul>
          <li>
            <Trans>
              You may request a paper copy of any electronically provided document by contacting{' '}
              <a href={`mailto:${GITLAW_SUPPORT_EMAIL}`}>{GITLAW_SUPPORT_EMAIL}</a>.
            </Trans>
          </li>
          <li>
            <Trans>
              Paper copies may be subject to a fee covering printing and delivery costs and may
              delay completion of the transaction.
            </Trans>
          </li>
        </ul>

        <h2>
          <Trans>6. Withdrawing Consent</Trans>
        </h2>
        <ul>
          <li>
            <Trans>
              You may withdraw your consent before completing a signing by declining to sign the
              document or contacting the document sender.
            </Trans>
          </li>
          <li>
            <Trans>
              Withdrawing consent may prevent the document from being completed electronically.
            </Trans>
          </li>
        </ul>

        <h2>
          <Trans>7. Contact Information & Updates</Trans>
        </h2>
        <p>
          <Trans>
            You are responsible for keeping your contact information, including your email address,
            up to date so you can receive documents and notices.
          </Trans>
        </p>

        <h2>
          <Trans>8. Acknowledgment</Trans>
        </h2>
        <p>
          <Trans>By proceeding, you confirm that:</Trans>
        </p>
        <ul>
          <li>
            <Trans>you can access and read electronic documents;</Trans>
          </li>
          <li>
            <Trans>you can download or print them for your records; and</Trans>
          </li>
          <li>
            <Trans>you consent to electronic records and signatures as described above.</Trans>
          </li>
        </ul>

        <p>
          <Trans>
            For questions, contact{' '}
            <a href={`mailto:${GITLAW_SUPPORT_EMAIL}`}>{GITLAW_SUPPORT_EMAIL}</a>.
          </Trans>
        </p>
      </article>

      <div className="mt-8">
        <Button asChild>
          <a href={GITLAW_HOME_URL()}>
            <Trans>Back home</Trans>
          </a>
        </Button>
      </div>
    </div>
  );
}
