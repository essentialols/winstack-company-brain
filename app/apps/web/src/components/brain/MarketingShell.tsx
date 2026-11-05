'use client';

import { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BrandLink } from './BrandMark';
import { useAuth } from '@/hooks/use-auth';

const NAV_LINKS = [
  { href: '/how-it-works', label: 'How it works' },
  { href: '/pricing', label: 'Pricing' },
  { href: '/sample-issue', label: 'Sample issue' },
] as const;

/** Public marketing chrome (Home / HowItWorks / Pricing mockups): top nav + footer. */
export const MarketingShell = ({ children }: { children: ReactNode }) => {
  const pathname = usePathname() ?? '';
  const { isAuthenticated, isLoaded } = useAuth();
  const isSignedIn = isLoaded && isAuthenticated;

  return (
    <div className="oib">
      <header className="oib-topbar">
        <nav aria-label="Main" className="oib-wide">
          <BrandLink isCurrent={pathname === '/'} />
          <div className="oib-navlinks">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="oib-navlink"
                aria-current={pathname === link.href ? 'page' : undefined}
              >
                {link.label}
              </Link>
            ))}
            {isSignedIn ? (
              <Link href="/dashboard" className="oib-navlink">
                Dashboard
              </Link>
            ) : (
              <Link href="/login" className="oib-navlink">
                Sign in
              </Link>
            )}
            <Link href="/extension" className="oib-primary" style={{ fontSize: '.9rem' }}>
              Add to Chrome
            </Link>
          </div>
        </nav>
      </header>

      <main>{children}</main>

      <footer className="oib-footer">
        <div className="oib-wide">
          <p className="oib-meta">Outside-In Brain · Company Brain Hackathon</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0 1.1rem' }}>
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                aria-current={pathname === link.href ? 'page' : undefined}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
};
