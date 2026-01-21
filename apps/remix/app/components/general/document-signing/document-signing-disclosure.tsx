import type { HTMLAttributes } from 'react';

import { msg } from '@lingui/core/macro';
import { useLingui } from '@lingui/react';
import { Trans } from '@lingui/react/macro';
import { RecipientRole } from '@prisma/client';
import { Link } from 'react-router';

import { cn } from '@documenso/ui/lib/utils';
import { Checkbox } from '@documenso/ui/primitives/checkbox';

export type DocumentSigningDisclosureProps = HTMLAttributes<HTMLDivElement> & {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  role?: RecipientRole;
};

const getRoleActionText = (role: RecipientRole | undefined) => {
  switch (role) {
    case RecipientRole.APPROVER:
      return msg`approve`;
    case RecipientRole.VIEWER:
      return msg`view`;
    case RecipientRole.ASSISTANT:
      return msg`assist with`;
    case RecipientRole.CC:
      return msg`receive a copy of`;
    case RecipientRole.SIGNER:
    default:
      return msg`sign`;
  }
};

export const DocumentSigningDisclosure = ({
  className,
  checked,
  onCheckedChange,
  role,
  ...props
}: DocumentSigningDisclosureProps) => {
  const { _ } = useLingui();
  const actionText = _(getRoleActionText(role));

  return (
    <div className={cn('flex items-start gap-3', className)} {...props}>
      <Checkbox
        id="consent-checkbox"
        checked={checked}
        onCheckedChange={(value) => onCheckedChange(value === true)}
        className="mt-0.5"
      />
      <label
        htmlFor="consent-checkbox"
        className="cursor-pointer text-sm leading-relaxed text-muted-foreground"
      >
        <Trans>
          I agree to {actionText} this document electronically and receive records in electronic
          form, as described in the{' '}
          <Link
            className="text-documenso-700 underline"
            to="/articles/signature-disclosure"
            target="_blank"
            onClick={(e) => e.stopPropagation()}
          >
            Electronic Signature Disclosure
          </Link>
          .
        </Trans>
      </label>
    </div>
  );
};
