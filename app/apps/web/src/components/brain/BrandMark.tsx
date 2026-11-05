import Link from 'next/link';

export const LogoMark = ({ size = 28 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 28 28" aria-hidden="true">
    <rect x="2" y="2" width="24" height="24" rx="7" fill="var(--fg)" />
    <path
      d="M8 11h12M8 15h8M8 19h5"
      stroke="var(--accent)"
      strokeWidth="2.2"
      strokeLinecap="round"
    />
  </svg>
);

/** Logo mark + "Outside-In Brain" wordmark, linking home. */
export const BrandLink = ({ href = '/', isCurrent = false }: { href?: string; isCurrent?: boolean }) => (
  <Link href={href} className="oib-brand" aria-current={isCurrent ? 'page' : undefined}>
    <LogoMark />
    <span className="oib-wordmark">Outside-In Brain</span>
  </Link>
);
