'use client';

import { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

/**
 * Routes that render the Outside-In Brain editorial design with their own
 * header/sidebar, so the starter's header and icon sidebar stay off them.
 */
const EDITORIAL_PREFIXES = [
  '/how-it-works',
  '/pricing',
  '/login',
  '/dashboard',
  '/issues',
  '/extension',
  '/sample-issue',
] as const;

export const isEditorialPath = (pathname: string): boolean =>
  pathname === '/' ||
  EDITORIAL_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));

interface AppChromeProps {
  header: ReactNode;
  sideNav: ReactNode;
  hideSidebar: boolean;
  children: ReactNode;
}

export const AppChrome = ({ header, sideNav, hideSidebar, children }: AppChromeProps) => {
  const pathname = usePathname() ?? '';
  const isEditorial = isEditorialPath(pathname);
  const showSidebar = !hideSidebar && !isEditorial;

  return (
    <div className="min-h-screen flex flex-col">
      {!isEditorial && header}
      <div className="flex flex-1 min-w-0">
        {showSidebar && sideNav}
        {/* Editorial pages render their own <main> landmark. */}
        {isEditorial ? (
          <div className="flex-1 min-w-0">{children}</div>
        ) : (
          <main className={cn('flex-1 min-w-0', showSidebar && 'md:ml-16')}>{children}</main>
        )}
      </div>
    </div>
  );
};
