'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { AuthCard } from '@/components/landing/AuthCard';
import { BrandLink } from '@/components/brain/BrandMark';
import { authStorage } from '@/lib/auth-storage';

/**
 * Sign-in page in the SignIn.dc.html style. The starter's AuthCard (password, OTP,
 * Google, sign-up) is kept as-is and rethemed through the `.oib-auth` scope.
 */
export default function LoginPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tab = searchParams.get('tab');
  const initialMode = tab === 'signup' ? 'signup' : 'login';
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  useEffect(() => {
    if (!authStorage.isAuthenticated()) {
      setIsCheckingAuth(false);
      return;
    }
    const intent = searchParams.get('intent');
    const redirect = searchParams.get('redirect');
    if (redirect) {
      router.push(redirect);
    } else if (intent === 'presentation') {
      router.push('/create-topic?from=login');
    } else if (intent === 'calendar') {
      router.push('/organizations/create');
    } else if (intent === 'collaboration') {
      router.push('/events/create');
    } else {
      router.push('/dashboard');
    }
  }, [router]);

  return (
    <div className="oib" style={{ display: 'flex', flexDirection: 'column' }}>
      <header>
        <div className="oib-wide" style={{ paddingTop: '.75rem', paddingBottom: '.75rem', display: 'flex', alignItems: 'center' }}>
          <BrandLink />
        </div>
      </header>
      <main style={{ flex: 1, width: '100%', padding: '3.5rem 16px 4rem' }}>
        <div style={{ maxWidth: '28rem', margin: '0 auto' }}>
          {isCheckingAuth ? (
            <p className="oib-eyebrow" role="status">
              Loading…
            </p>
          ) : (
            <>
              <p className="oib-eyebrow" style={{ marginBottom: '.75rem' }}>
                {initialMode === 'signup' ? 'Create your account' : 'Sign in'}
              </p>
              <h1 className="oib-h1" style={{ marginBottom: '1.5rem' }}>
                Sign in or create an account
              </h1>
              <div className="oib-auth">
                <AuthCard initialMode={initialMode} />
              </div>
              <p className="oib-muted" style={{ marginTop: '2rem', fontSize: '1rem', lineHeight: 1.6 }}>
                Got an invite link from your partner or your team? Open it and sign in with the same email, and
                you&apos;ll join their shared workspace instead of starting a new one.
              </p>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
