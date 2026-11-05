'use client';

import { ReactNode, useEffect, useState } from 'react';
import Link from 'next/link';
import type { IssueDto } from '@app-starter/shared';
import { BrandLink } from './BrandMark';
import { IssueVisual } from './IssueVisual';
import { PodcastPlayer } from './PodcastPlayer';
import { resolveAudioSrc } from '@/lib/brain-api';
import { formatShortDate } from '@/lib/brain-format';
import { cn } from '@/lib/utils';

interface IssueViewProps {
  issue: IssueDto;
  /** Small label before the issue number, e.g. "Sample". */
  badge?: string;
  backHref?: string;
  backLabel?: string;
  footer?: ReactNode;
}

/** Hook: turn issue.audioUrl into a playable src (blob URL for authenticated API streams). */
const useAudioSrc = (audioUrl: string | null) => {
  const [src, setSrc] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!audioUrl) return;
    let isCancelled = false;
    let blobUrl: string | null = null;
    setIsLoading(true);
    setError(null);
    resolveAudioSrc(audioUrl)
      .then((resolved) => {
        if (resolved.startsWith('blob:')) blobUrl = resolved;
        if (!isCancelled) setSrc(resolved);
      })
      .catch(() => {
        if (!isCancelled) setError('The audio could not be loaded. Try reloading the page.');
      })
      .finally(() => {
        if (!isCancelled) setIsLoading(false);
      });
    return () => {
      isCancelled = true;
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  }, [audioUrl]);

  return { src, isLoading, error };
};

/** The issue reading view (Main.dc.html). */
export const IssueView = ({ issue, badge, backHref = '/dashboard', backLabel = 'Dashboard', footer }: IssueViewProps) => {
  const { content } = issue;
  const takeaways = content.takeaways ?? [];
  const [openSet, setOpenSet] = useState<Set<number>>(() => new Set(takeaways.length ? [0] : []));
  const audio = useAudioSrc(issue.audioUrl);

  const handleToggle = (index: number) =>
    setOpenSet((current) => {
      const next = new Set(current);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  const handleExpandAll = () => setOpenSet(new Set(takeaways.map((_, index) => index)));
  const handleCollapseAll = () => setOpenSet(new Set());

  return (
    <div className="oib">
      <header className="oib-col" style={{ paddingTop: '1.25rem', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '.75rem 1rem' }}>
        <BrandLink />
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '.5rem .9rem' }}>
          <span className="oib-eyebrow" style={{ fontSize: '.74rem' }}>
            {badge ? `${badge} · ` : ''}Issue {issue.number} · {formatShortDate(issue.publishedAt)}
          </span>
          <Link href={backHref} className="oib-pill">
            {backLabel}
          </Link>
        </div>
      </header>

      <main className="oib-col" style={{ paddingTop: '2.5rem', paddingBottom: '3rem' }}>
        <p className="oib-eyebrow" style={{ margin: '0 0 .9rem', fontSize: '.76rem' }}>
          {content.eyebrow}
        </p>
        <h1 className="oib-h1" style={{ marginBottom: '1rem' }}>
          {content.title || issue.title}
        </h1>
        <p className="oib-lead" style={{ marginBottom: '2rem' }}>
          {content.lead}
        </p>

        {issue.audioUrl && (
          <PodcastPlayer
            src={audio.src}
            isLoadingSrc={audio.isLoading}
            srcError={audio.error}
            podcast={content.podcast}
            durationSec={issue.audioDurationSec}
          />
        )}

        {takeaways.length > 0 && (
          <>
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '.6rem 1rem', paddingBottom: '.75rem', borderBottom: '1px solid var(--rule)' }}>
              <span className="oib-eyebrow" style={{ fontSize: '.74rem' }}>
                Tap any takeaway for the details
              </span>
              <div style={{ display: 'flex', gap: '.5rem' }}>
                <button type="button" className="oib-pill" onClick={handleExpandAll}>
                  Expand all
                </button>
                <button type="button" className="oib-pill" onClick={handleCollapseAll}>
                  Collapse all
                </button>
              </div>
            </div>

            <h2 className="oib-eyebrow" style={{ margin: '1.5rem 0 .5rem', fontFamily: 'var(--f-mono)', fontWeight: 500, fontSize: '.76rem' }}>
              TL;DR · {takeaways.length} takeaway{takeaways.length === 1 ? '' : 's'}
            </h2>
            <ol style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              {takeaways.map((takeaway, index) => {
                const isOpen = openSet.has(index);
                const detailId = `takeaway-${index + 1}`;
                return (
                  <li key={index} style={{ borderBottom: '1px solid var(--rule)', padding: '.35rem 0' }}>
                    <button
                      type="button"
                      className={cn('oib-row')}
                      onClick={() => handleToggle(index)}
                      aria-expanded={isOpen}
                      aria-controls={detailId}
                      style={{
                        width: '100%',
                        minHeight: 44,
                        display: 'grid',
                        gridTemplateColumns: '2.6rem 1fr 1.5rem',
                        gap: '.25rem',
                        alignItems: 'start',
                        textAlign: 'left',
                        padding: '.7rem .6rem',
                        color: 'var(--fg)',
                        border: `1px solid ${isOpen ? 'var(--box-line)' : 'transparent'}`,
                        background: isOpen ? 'var(--box)' : undefined,
                      }}
                    >
                      <span style={{ fontFamily: 'var(--f-display)', fontWeight: 800, fontSize: '1.15rem', color: 'var(--accent)', fontVariantNumeric: 'tabular-nums', lineHeight: 1.45 }}>
                        {index + 1}
                      </span>
                      <span style={{ fontSize: '1.0625rem', lineHeight: 1.55 }}>
                        <strong style={{ fontWeight: 600 }}>{takeaway.title}</strong> {takeaway.line}
                      </span>
                      <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="var(--muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginTop: '.3rem', transition: 'transform .2s ease', transform: `rotate(${isOpen ? 180 : 0}deg)` }}>
                        <path d="M6 9l6 6 6-6" />
                      </svg>
                    </button>
                    <div id={detailId} hidden={!isOpen} style={{ padding: '1rem .5rem 1.4rem 2.75rem' }}>
                      <h3 style={{ margin: '0 0 .6rem', fontSize: '1.3rem', lineHeight: 1.25 }}>{takeaway.heading}</h3>
                      {takeaway.detail.map((paragraph, paragraphIndex) => (
                        <p key={paragraphIndex} style={{ margin: '0 0 1rem', lineHeight: 1.6 }}>
                          {paragraph}
                        </p>
                      ))}
                      {takeaway.quote && (
                        <blockquote className="oib-quote">
                          {takeaway.quote.text}
                          {takeaway.quote.cite && (
                            <cite className="oib-meta" style={{ display: 'block', fontStyle: 'normal', marginTop: '.35rem' }}>
                              {takeaway.quote.cite}
                            </cite>
                          )}
                        </blockquote>
                      )}
                      {takeaway.visual && <IssueVisual visual={takeaway.visual} />}
                      {takeaway.todo && (
                        <div className="oib-todo" style={{ margin: '0 0 .9rem' }}>
                          <p className="oib-todo-label">What to do with this</p>
                          <p style={{ lineHeight: 1.55 }}>{takeaway.todo}</p>
                        </div>
                      )}
                      {takeaway.sources.length > 0 && (
                        <p className="oib-meta" style={{ letterSpacing: '.06em', fontSize: '.74rem' }}>
                          {takeaway.sources.length === 1 ? 'Source: ' : 'Sources: '}
                          {takeaway.sources.map((source, sourceIndex) => (
                            <span key={source.saveId}>
                              {sourceIndex > 0 && ' · '}
                              {source.url ? (
                                <a href={source.url} target="_blank" rel="noopener noreferrer">
                                  {source.title}
                                  <span className="oib-sr"> (opens in a new tab)</span>
                                </a>
                              ) : (
                                source.title
                              )}
                              {source.savedBy ? ` (saved by ${source.savedBy})` : ''}
                            </span>
                          ))}
                        </p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          </>
        )}

        {content.alsoSaved.length > 0 && (
          <section aria-labelledby="also-h" style={{ margin: '2.5rem 0 0' }}>
            <h2 id="also-h" className="oib-eyebrow" style={{ margin: '0 0 .5rem', fontFamily: 'var(--f-mono)', fontWeight: 500, fontSize: '.76rem' }}>
              Also saved
            </h2>
            <ul className="oib-rows">
              {content.alsoSaved.map((item) => (
                <li key={item.saveId} style={{ padding: '.8rem 0', lineHeight: 1.55 }}>
                  <span style={{ display: 'block', fontFamily: 'var(--f-display)', fontWeight: 700 }}>{item.title}</span>
                  <span>{item.note}</span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>

      <footer className="oib-col" style={{ paddingTop: '1.25rem', paddingBottom: '2.5rem' }}>
        <div style={{ borderTop: '1px solid var(--rule)', paddingTop: '1.25rem', display: 'flex', flexWrap: 'wrap', gap: '.5rem 1rem', justifyContent: 'space-between', alignItems: 'center' }}>
          {footer ?? (
            <Link href="/dashboard" className="oib-eyebrow oib-btn" style={{ color: 'var(--accent)', fontSize: '.74rem' }}>
              Manage saves
            </Link>
          )}
        </div>
      </footer>
    </div>
  );
};
