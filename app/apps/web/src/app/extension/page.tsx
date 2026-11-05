'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MarketingShell } from '@/components/brain/MarketingShell';
import { useAuth } from '@/hooks/use-auth';
import { brainApi, CreateApiTokenResponse, EXTENSION_API_BASE_URL } from '@/lib/brain-api';
import { formatShortDate } from '@/lib/brain-format';
import type { ApiError } from '@/lib/api-client';

/** Placeholder until the extension is published. */
const CHROME_WEB_STORE_URL = '[CHROME WEB STORE LINK]';

const errorMessage = (error: unknown): string =>
  (error as ApiError | undefined)?.message ?? 'Something went wrong. Please try again.';

const CopyField = ({ id, label, value }: { id: string; label: string; value: string }) => {
  const [isCopied, setIsCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch {
      (document.getElementById(id) as HTMLInputElement | null)?.select();
    }
  };

  return (
    <div style={{ marginBottom: '1rem' }}>
      <label htmlFor={id} className="oib-label">
        {label}
      </label>
      <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>
        <input
          id={id}
          className="oib-input"
          readOnly
          value={value}
          onFocus={(event) => event.target.select()}
          style={{ flex: '1 1 16rem', fontFamily: 'var(--f-mono)', fontSize: '.9rem', width: 'auto' }}
        />
        <button type="button" className="oib-pill" onClick={handleCopy}>
          {isCopied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <span className="oib-sr" role="status" aria-live="polite">
        {isCopied ? `${label} copied` : ''}
      </span>
    </div>
  );
};

const STEPS = [
  {
    title: 'Load the extension',
    body: (
      <>
        During the hackathon the extension is not in the Chrome Web Store yet ({CHROME_WEB_STORE_URL}). Open{' '}
        <code>chrome://extensions</code>, turn on Developer mode, click “Load unpacked” and pick the{' '}
        <code>apps/extension</code> folder of the repository.
      </>
    ),
  },
  {
    title: 'Pin it',
    body: <>Pin Outside-In Brain in the toolbar so saving is one click away. Shortcut: Alt+Shift+S.</>,
  },
  {
    title: 'Connect your account',
    body: (
      <>
        Create an extension key below. Open the extension’s options, paste the API URL and the key, then click
        “Test connection”.
      </>
    ),
  },
] as const;

export default function ExtensionPage() {
  const { isAuthenticated, isLoaded } = useAuth();
  const isSignedIn = isLoaded && isAuthenticated;
  const queryClient = useQueryClient();
  const [keyName, setKeyName] = useState('Chrome extension');
  const [created, setCreated] = useState<CreateApiTokenResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [webUrl, setWebUrl] = useState('');

  useEffect(() => {
    setWebUrl(window.location.origin);
  }, []);

  const tokensQuery = useQuery({
    queryKey: ['api-tokens'],
    queryFn: () => brainApi.listApiTokens(),
    enabled: isSignedIn,
  });

  const createToken = useMutation({
    mutationFn: (name: string) => brainApi.createApiToken({ name }),
    onSuccess: (response) => {
      setCreated(response);
      setError(null);
      void queryClient.invalidateQueries({ queryKey: ['api-tokens'] });
    },
    onError: (mutationError) => setError(errorMessage(mutationError)),
  });

  const revokeToken = useMutation({
    mutationFn: (id: string) => brainApi.revokeApiToken(id),
    onSuccess: (_result, id) => {
      if (created?.apiToken.id === id) setCreated(null);
      void queryClient.invalidateQueries({ queryKey: ['api-tokens'] });
    },
    onError: (mutationError) => setError(errorMessage(mutationError)),
  });

  const handleCreate = (event: FormEvent) => {
    event.preventDefault();
    createToken.mutate(keyName.trim() || 'Chrome extension');
  };

  const tokens = tokensQuery.data ?? [];

  return (
    <MarketingShell>
      <section className="oib-col" style={{ paddingTop: '4rem', paddingBottom: '2rem' }}>
        <p className="oib-eyebrow" style={{ marginBottom: '1rem' }}>
          Chrome extension
        </p>
        <h1 className="oib-hero" style={{ marginBottom: '1.25rem' }}>
          Connect the extension
        </h1>
        <p className="oib-lead">
          One click saves the page you are on to your brain. Nothing is saved unless you click, and the extension
          never reads pages you do not save.
        </p>
      </section>

      <section aria-labelledby="install-h" className="oib-col" style={{ paddingBottom: '2.5rem' }}>
        <h2 id="install-h" className="oib-h2s" style={{ marginBottom: '.75rem' }}>
          Install
        </h2>
        <ol className="oib-rows">
          {STEPS.map((step, index) => (
            <li key={step.title} style={{ display: 'flex', gap: '.5rem', padding: '1rem .75rem' }}>
              <span className="oib-num">{index + 1}</span>
              <div style={{ minWidth: 0 }}>
                <h3 style={{ fontSize: '1.1rem', marginBottom: '.25rem' }}>{step.title}</h3>
                <p>{step.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="key-h" className="oib-col" style={{ paddingBottom: '4rem' }}>
        <h2 id="key-h" className="oib-h2s" style={{ marginBottom: '.75rem' }}>
          Extension key
        </h2>

        {!isLoaded && (
          <p className="oib-eyebrow" role="status">
            Loading…
          </p>
        )}

        {isLoaded && !isSignedIn && (
          <div style={{ background: 'var(--chip)', borderRadius: 10, padding: '1.25rem 1.25rem 1.4rem' }}>
            <p style={{ marginBottom: '1rem' }}>Sign in to create a key for the extension.</p>
            <Link href="/login?redirect=/extension" className="oib-primary">
              Sign in
            </Link>
          </div>
        )}

        {isSignedIn && (
          <>
            <CopyField id="api-url" label="API URL" value={EXTENSION_API_BASE_URL} />
            {webUrl && <CopyField id="web-url" label="Web app URL" value={webUrl} />}

            {created ? (
              <div style={{ border: '1px solid var(--box-line)', background: 'var(--box)', borderRadius: 8, padding: '1rem', marginBottom: '1.5rem' }}>
                <p className="oib-ok" role="status" style={{ marginBottom: '.75rem' }}>
                  Key “{created.apiToken.name}” created. Copy it now: it is shown only once.
                </p>
                <CopyField id="new-key" label="Extension key" value={created.token} />
                <button type="button" className="oib-textbtn" onClick={() => setCreated(null)}>
                  Done, hide the key
                </button>
              </div>
            ) : (
              <form onSubmit={handleCreate} style={{ marginBottom: '1.5rem' }}>
                <label htmlFor="key-name" className="oib-label">
                  Key name
                </label>
                <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>
                  <input
                    id="key-name"
                    className="oib-input"
                    value={keyName}
                    maxLength={80}
                    onChange={(event) => setKeyName(event.target.value)}
                    style={{ flex: '1 1 14rem', width: 'auto' }}
                  />
                  <button type="submit" className="oib-primary" disabled={createToken.isPending}>
                    {createToken.isPending ? 'Creating…' : 'Create extension key'}
                  </button>
                </div>
              </form>
            )}

            {error && (
              <p className="oib-error" role="alert" style={{ marginBottom: '1rem' }}>
                {error}
              </p>
            )}

            <h3 style={{ fontSize: '1.05rem', marginBottom: '.5rem' }}>Your keys</h3>
            {tokensQuery.isLoading && (
              <p className="oib-eyebrow" role="status">
                Loading keys…
              </p>
            )}
            {!tokensQuery.isLoading && tokens.length === 0 && <p className="oib-muted">No keys yet.</p>}
            {tokens.length > 0 && (
              <ul className="oib-rows">
                {tokens.map((token) => (
                  <li key={token.id} className="oib-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', padding: '.75rem .6rem', flexWrap: 'wrap' }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontFamily: 'var(--f-display)', fontWeight: 700 }}>{token.name}</div>
                      <div className="oib-meta">
                        {token.prefix}… · created {formatShortDate(token.createdAt)}
                        {token.lastUsedAt ? ` · last used ${formatShortDate(token.lastUsedAt)}` : ' · never used'}
                      </div>
                    </div>
                    <button
                      type="button"
                      className="oib-pill"
                      disabled={revokeToken.isPending && revokeToken.variables === token.id}
                      onClick={() => {
                        if (window.confirm(`Revoke “${token.name}”? The extension using it will stop saving.`)) {
                          revokeToken.mutate(token.id);
                        }
                      }}
                      aria-label={`Revoke key ${token.name}`}
                    >
                      Revoke
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <p style={{ marginTop: '2rem' }}>
              <Link href="/dashboard">Back to your brain</Link>
            </p>
          </>
        )}
      </section>
    </MarketingShell>
  );
}
