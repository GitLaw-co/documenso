import type { SVGAttributes } from 'react';

export type LogoProps = SVGAttributes<SVGSVGElement>;

/**
 * GitLaw icon only (no text)
 * Source: front-law/src/components/ui/logo.tsx (LogoImage)
 */
export const BrandingLogoIcon = ({ ...props }: LogoProps) => {
  return (
    <svg
      width="27"
      height="27"
      viewBox="0 0 219 218"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <g clipPath="url(#clip0_branding_icon)">
        <rect x="51.5283" y="11.8906" width="43.6011" height="60.1166" fill="currentColor" />
        <rect x="125.519" y="145.336" width="43.6011" height="60.1166" fill="currentColor" />
        <rect
          x="207.436"
          y="50.211"
          width="43.6011"
          height="60.1166"
          transform="rotate(90 207.436 50.211)"
          fill="currentColor"
        />
        <rect
          x="136.978"
          y="0"
          width="43.6011"
          height="60.1166"
          transform="rotate(45 136.978 0)"
          fill="currentColor"
        />
        <rect
          x="94.698"
          y="144.68"
          width="43.6011"
          height="60.1166"
          transform="rotate(45 94.698 144.68)"
          fill="currentColor"
        />
        <rect
          x="0"
          y="82.359"
          width="43.6011"
          height="60.1166"
          transform="rotate(-45 0 82.359)"
          fill="currentColor"
        />
        <rect
          x="145.997"
          y="123.32"
          width="43.6011"
          height="60.1166"
          transform="rotate(-45 145.997 123.32)"
          fill="currentColor"
        />
        <rect
          x="73.3291"
          y="123.539"
          width="43.6011"
          height="60.1166"
          transform="rotate(90 73.3291 123.539)"
          fill="currentColor"
        />
      </g>
      <defs>
        <clipPath id="clip0_branding_icon">
          <rect width="219.337" height="218.016" fill="white" />
        </clipPath>
      </defs>
    </svg>
  );
};
