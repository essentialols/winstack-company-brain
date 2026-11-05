'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { IssueDto, SaveDto } from '@app-starter/shared';
import { BrandLink } from '@/components/brain/BrandMark';

const DEMO_ISSUE_STORAGE_KEY = 'oib-demo-issue';

const timeAgo = (iso: string) => {
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  return hours < 24 ? `${hours} h ago` : new Date(iso).toLocaleDateString();
};

const readError = async (res: Response) => {
  const data = (await res.json().catch(() => null)) as { message?: string } | null;
  return data?.message ?? `Request failed (${res.status})`;
};

/** No-login demo brain: paste or save from the extension, then build an issue. */
const DemoPage = () => {
  const router = useRouter();
  const [saves, setSaves] = useState<SaveDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [draft, setDraft] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [isBuilding, setIsBuilding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [origin, setOrigin] = useState('');

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/demo/saves', { cache: 'no-store' });
      if (!res.ok) throw new Error(await readError(res));
      setSaves((await res.json()) as SaveDto[]);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    setOrigin(window.location.origin);
    void load();
    // Saves made from the extension show up without a manual refresh.
    const timer = window.setInterval(() => void load(), 5000);
    return () => window.clearInterval(timer);
  }, [load]);

  const handleAdd = async (event: FormEvent) => {
    event.preventDefault();
    if (!draft.trim()) return;
    setIsAdding(true);
    setError(null);
    try {
      const res = await fetch('/api/demo/saves', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: draft }),
      });
      if (!res.ok) throw new Error(await readError(res));
      setDraft('');
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setIsAdding(false);
    }
  };

  const handleDelete = async (id: string) => {
    setSaves((current) => current.filter((s) => s.id !== id));
    await fetch(`/api/demo/saves/${id}`, { method: 'DELETE' }).catch(() => null);
  };

  const handleBuild = async () => {
    setIsBuilding(true);
    setError(null);
    try {
      const res = await fetch('/api/demo/issue', { method: 'POST' });
      if (!res.ok) throw new Error(await readError(res));
      const issue = (await res.json()) as IssueDto;
      try {
        sessionStorage.setItem(DEMO_ISSUE_STORAGE_KEY, JSON.stringify(issue));
      } catch {
        /* storage blocked: the issue page falls back to the server copy */
      }
      router.push('/demo/issue');
    } catch (e) {
      setError((e as Error).message);
      setIsBuilding(false);
    }
  };

  return (
    <div className="oib">
      <header className="oib-col" style={{ paddingTop: '1.25rem', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '.75rem' }}>
        <BrandLink />
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.5rem' }}>
          <Link href="/sample-issue" className="oib-pill">
            Sample issue
          </Link>
          <Link href="/" className="oib-pill">
            Home
          </Link>
        </div>
      </header>

      <main className="oib-col" style={{ paddingTop: '2.5rem', paddingBottom: '4rem', display: 'flex', flexDirection: 'column', gap: '2.25rem' }}>
        <section>
          <p className="oib-eyebrow" style={{ margin: '0 0 .8rem' }}>
            Demo brain · no account needed
          </p>
          <h1 className="oib-h1" style={{ marginBottom: '1rem' }}>
            Save a few things, then build this week&apos;s issue
          </h1>
          <p className="oib-lead">
            Paste links or text here, or click the extension on any page. When you have a few saves, build the issue to get takeaways and a two-voice podcast.
          </p>
        </section>

        <form onSubmit={handleAdd} style={{ display: 'flex', flexDirection: 'column', gap: '.6rem' }}>
          <label htmlFor="demo-paste" className="oib-label">
            Paste a link or any text
          </label>
          <textarea
            id="demo-paste"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={4}
            placeholder="https://… or paste notes, a quote, an article"
            style={{ width: '100%', boxSizing: 'border-box', padding: '.75rem .9rem', borderRadius: 8, border: '1px solid var(--box-line)', background: 'var(--bg)', color: 'var(--fg)', font: 'inherit', resize: 'vertical' }}
          />
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '.75rem' }}>
            <button type="submit" className="oib-primary" disabled={isAdding || !draft.trim()}>
              {isAdding ? 'Adding…' : 'Add to brain'}
            </button>
            <span className="oib-meta">Or click the extension on any page</span>
          </div>
        </form>

        {error && (
          <p role="alert" className="oib-error" style={{ margin: 0 }}>
            {error}
          </p>
        )}

        <section aria-labelledby="demo-saves">
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', justifyContent: 'space-between', gap: '.75rem', borderBottom: '1px solid var(--rule)', paddingBottom: '.6rem' }}>
            <h2 id="demo-saves" className="oib-eyebrow" style={{ margin: 0 }}>
              Saved · {saves.length}
            </h2>
            <button type="button" className="oib-primary" onClick={handleBuild} disabled={isBuilding || saves.length === 0}>
              {isBuilding ? 'Building the issue…' : "Build this week's issue"}
            </button>
          </div>
          {isLoading ? (
            <p className="oib-muted">Loading…</p>
          ) : saves.length === 0 ? (
            <p className="oib-muted" style={{ marginTop: '1rem' }}>
              Nothing saved yet. Paste something above, or save a page with the extension.
            </p>
          ) : (
            <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              {saves.map((save) => (
                <li key={save.id} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start', justifyContent: 'space-between', padding: '.9rem 0', borderBottom: '1px solid var(--rule)' }}>
                  <div style={{ minWidth: 0 }}>
                    <p style={{ margin: 0, fontFamily: 'var(--f-display)', fontWeight: 700, overflowWrap: 'anywhere' }}>
                      {save.url ? (
                        <a href={save.url} target="_blank" rel="noreferrer" style={{ color: 'inherit' }}>
                          {save.title}
                        </a>
                      ) : (
                        save.title
                      )}
                    </p>
                    {save.excerpt && (
                      <p className="oib-muted" style={{ margin: '.2rem 0 0', fontSize: '.98rem' }}>
                        {save.excerpt}
                      </p>
                    )}
                    <p className="oib-meta" style={{ margin: '.3rem 0 0' }}>
                      {save.kind.toLowerCase()} · {save.source === 'EXTENSION' ? 'extension' : 'pasted'} · {timeAgo(save.createdAt)}
                    </p>
                  </div>
                  <button type="button" className="oib-textbtn" onClick={() => handleDelete(save.id)} aria-label={`Remove ${save.title}`}>
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="oib-todo" aria-labelledby="demo-extension">
          <h2 id="demo-extension" className="oib-todo-label" style={{ margin: '0 0 .4rem' }}>
            Use the extension with this demo
          </h2>
          <ol style={{ margin: 0, paddingLeft: '1.2rem', display: 'flex', flexDirection: 'column', gap: '.3rem' }}>
            <li>Load it unpacked in Chrome from <code>app/apps/extension</code>.</li>
            <li>In its settings, leave <strong>Extension key</strong> empty.</li>
            <li>
              Set <strong>Web app URL</strong> to <code>{origin || 'this site'}</code> and save. Without a key it saves straight into this demo brain.
            </li>
          </ol>
        </section>
      </main>
    </div>
  );
};

export default DemoPage;
