'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Geist } from 'next/font/google';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import styles from './SignalLanding.module.css';

const geist = Geist({ subsets: ['latin'], weight: '400', display: 'swap' });

const STEPS = [
  {
    word: 'Collect',
    src: '/landing/collect.png',
    alt: 'Loose, tangled crayon strokes on black.',
  },
  {
    word: 'Store',
    src: '/landing/store.png',
    alt: 'Crayon strokes sorted into neat parallel rows on black.',
  },
  {
    word: 'Distill',
    src: '/landing/distill.png',
    alt: 'Three crayon strokes narrow into one clean line on black.',
  },
] as const;

/** Sun/moon switch. Uses next-themes so the choice carries over to the rest of the app. */
const ThemeToggle = () => {
  const { resolvedTheme, setTheme } = useTheme();
  // The theme is unknown during server render; render a neutral state until mounted.
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => setIsMounted(true), []);
  const isDark = isMounted && resolvedTheme === 'dark';

  const handleToggle = () => setTheme(isDark ? 'light' : 'dark');

  return (
    <button
      type="button"
      className={styles.theme}
      onClick={handleToggle}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      <span className={isMounted && !isDark ? styles.on : undefined}>
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
        </svg>
      </span>
      <span className={isDark ? styles.on : undefined}>
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M20.5 14.5A8.5 8.5 0 0 1 9.5 3.5a8.5 8.5 0 1 0 11 11Z" />
        </svg>
      </span>
    </button>
  );
};

/** Landing page: one portrait column where words and pictures take turns. */
export const SignalLanding = () => (
  <div className={`${styles.page} ${geist.className}`}>
    <ThemeToggle />
    <main className={styles.main}>
      <h1 className={styles.line}>Separate signal from the noise.</h1>
      <Image
        className={styles.picture}
        src="/landing/hero-signal-from-noise.png"
        alt="Tangled crayon strokes converge at one point and leave as a single clean red line."
        width={1792}
        height={1648}
        priority
        sizes="(max-width: 752px) 100vw, 720px"
      />
      {STEPS.map((step) => (
        <section key={step.word} className={styles.step}>
          <h2 className={styles.line}>{step.word}</h2>
          <Image
            className={styles.picture}
            src={step.src}
            alt={step.alt}
            width={880}
            height={536}
            sizes="(max-width: 752px) 100vw, 720px"
          />
        </section>
      ))}
      <nav className={styles.cta} aria-label="Get started">
        <Link href="/extension" className={styles.primary}>
          Add to Chrome
        </Link>
        <Link href="/login" className={styles.secondary}>
          Sign in
        </Link>
        <Link href="/how-it-works" className={styles.secondary}>
          How it works
        </Link>
      </nav>
    </main>
  </div>
);
