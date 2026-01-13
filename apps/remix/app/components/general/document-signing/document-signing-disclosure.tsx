import type { HTMLAttributes } from 'react';

import { Trans } from '@lingui/react/macro';
import { Link } from 'react-router';

import { cn } from '@documenso/ui/lib/utils';
import { Checkbox } from '@documenso/ui/primitives/checkbox';

export type DocumentSigningDisclosureProps = HTMLAttributes<HTMLDivElement> & {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
};

export const DocumentSigningDisclosure = ({
  className,
  checked,
  onCheckedChange,
  ...props
}: DocumentSigningDisclosureProps) => {
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
          I agree to sign this document electronically and receive records in electronic form, as
          described in the{' '}
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
