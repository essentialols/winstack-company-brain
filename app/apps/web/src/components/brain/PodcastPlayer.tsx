'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { IssueContent } from '@app-starter/shared';
import { formatClock } from '@/lib/brain-format';

const SPEEDS = [1, 1.5, 2] as const;
const INK_LINE = 'rgba(236,233,228,.15)';

interface PodcastPlayerProps {
  src: string | null;
  isLoadingSrc: boolean;
  srcError: string | null;
  podcast: IssueContent['podcast'];
  durationSec: number | null;
}

const HostBadge = ({ who, size = '2.2rem' }: { who: 'IN' | 'AN'; size?: string }) => (
  <span
    title={who === 'IN' ? 'Interviewer' : 'Analyst'}
    style={{
      width: size,
      height: size,
      borderRadius: 999,
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      flex: '0 0 auto',
      fontFamily: 'var(--f-mono)',
      fontWeight: 500,
      fontSize: '.7rem',
      letterSpacing: '.06em',
      color: 'var(--ink)',
      background: who === 'IN' ? 'var(--accent-on-ink)' : 'var(--on-ink)',
      border: '2px solid var(--ink)',
    }}
  >
    {who}
  </span>
);

/** Two-voice podcast player (Main.dc.html) on a real <audio> element. */
export const PodcastPlayer = ({ src, isLoadingSrc, srcError, podcast, durationSec }: PodcastPlayerProps) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(durationSec ?? 0);
  const [speed, setSpeed] = useState<number>(1);

  const chapters = useMemo(() => podcast?.chapters ?? [], [podcast]);
  const currentChapter = useMemo(() => {
    let index = 0;
    chapters.forEach((chapter, i) => {
      if (chapter.startSec <= currentTime + 0.25) index = i;
    });
    return index;
  }, [chapters, currentTime]);

  const nowLines = useMemo(
    () => (podcast?.transcript ?? []).filter((line) => line.chapter === currentChapter),
    [podcast, currentChapter],
  );

  useEffect(() => {
    if (audioRef.current) audioRef.current.playbackRate = speed;
  }, [speed, src]);

  const handleTogglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      void audio.play().catch(() => setIsPlaying(false));
    } else {
      audio.pause();
    }
  };

  const handleSeek = (seconds: number, shouldPlay = false) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = seconds;
    setCurrentTime(seconds);
    if (shouldPlay && audio.paused) void audio.play().catch(() => setIsPlaying(false));
  };

  const total = duration || durationSec || 0;
  const minutes = total ? Math.max(1, Math.round(total / 60)) : null;

  return (
    <section aria-label="Podcast player" className="oib-ink" style={{ borderRadius: 12, padding: '1.4rem 1.25rem 1.25rem', margin: '0 0 2.25rem' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem' }}>
        <div style={{ flex: '1 1 16rem', minWidth: 0 }}>
          <p className="oib-eyebrow" style={{ margin: '0 0 .45rem', color: 'var(--accent-on-ink)' }}>
            Listen instead{minutes ? ` · ${minutes} min` : ''}
          </p>
          <h2 style={{ margin: '0 0 .35rem', fontSize: '1.35rem', lineHeight: 1.2 }}>{podcast?.title ?? 'This issue, as a conversation'}</h2>
          <p style={{ fontSize: '1rem', lineHeight: 1.5, color: 'var(--on-ink-muted)' }}>
            An AI interviewer questions an AI analyst about this issue.
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center' }} role="img" aria-label="Hosts: interviewer and analyst">
          <HostBadge who="IN" size="2.5rem" />
          <span style={{ marginLeft: '-.55rem', display: 'inline-flex' }}>
            <HostBadge who="AN" size="2.5rem" />
          </span>
        </div>
      </div>

      {src && (
        <audio
          ref={audioRef}
          src={src}
          preload="metadata"
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onEnded={() => setIsPlaying(false)}
          onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
          onLoadedMetadata={(event) => {
            const value = event.currentTarget.duration;
            if (Number.isFinite(value) && value > 0) setDuration(value);
            event.currentTarget.playbackRate = speed;
          }}
        />
      )}

      {srcError && (
        <p role="alert" style={{ margin: '1rem 0 0', color: 'var(--accent-on-ink)', fontFamily: 'var(--f-display)', fontWeight: 600 }}>
          {srcError}
        </p>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: '.9rem', margin: '1.25rem 0 .9rem' }}>
        <button
          type="button"
          onClick={handleTogglePlay}
          disabled={!src}
          aria-label={isPlaying ? 'Pause podcast' : 'Play podcast'}
          style={{ flex: '0 0 auto', width: '3rem', height: '3rem', borderRadius: 999, border: 0, background: 'var(--accent-on-ink)', color: 'var(--ink)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
        >
          {isPlaying ? (
            <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
              <path d="M8 5v14M16 5v14" />
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
              <path d="M7 4.5v15l12.5-7.5z" />
            </svg>
          )}
        </button>
        <div style={{ flex: '1 1 auto', minWidth: 0 }}>
          <input
            type="range"
            min={0}
            max={Math.max(1, Math.round(total))}
            step={1}
            value={Math.min(Math.round(currentTime), Math.max(1, Math.round(total)))}
            onChange={(event) => handleSeek(Number(event.target.value))}
            disabled={!src}
            aria-label="Playback position"
            aria-valuetext={`${formatClock(currentTime)} of ${formatClock(total)}`}
            style={{ width: '100%', accentColor: 'var(--accent-on-ink)', margin: 0, minHeight: 24 }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '.2rem', fontFamily: 'var(--f-mono)', fontWeight: 500, fontSize: '.74rem', letterSpacing: '.06em', color: 'var(--on-ink-muted)' }}>
            <span>{isLoadingSrc ? 'Loading audio…' : formatClock(currentTime)}</span>
            <span>{formatClock(total)}</span>
          </div>
        </div>
      </div>

      <div role="group" aria-label="Playback speed" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '.4rem', margin: '0 0 1.1rem' }}>
        <span className="oib-eyebrow" style={{ fontSize: '.72rem', color: 'var(--on-ink-muted)', marginRight: '.3rem' }}>
          Speed
        </span>
        {SPEEDS.map((value) => {
          const isOn = value === speed;
          return (
            <button
              key={value}
              type="button"
              aria-pressed={isOn}
              onClick={() => setSpeed(value)}
              style={{
                minHeight: 44,
                minWidth: '3.2rem',
                padding: '0 .85rem',
                borderRadius: 999,
                fontFamily: 'var(--f-display)',
                fontWeight: 600,
                fontSize: '.85rem',
                border: `1px solid ${isOn ? 'var(--accent-on-ink)' : 'rgba(236,233,228,.3)'}`,
                background: isOn ? 'var(--accent-on-ink)' : 'transparent',
                color: isOn ? 'var(--ink)' : 'var(--on-ink)',
              }}
            >
              {value}×
            </button>
          );
        })}
      </div>

      {chapters.length > 0 && (
        <>
          <p className="oib-eyebrow" style={{ margin: '0 0 .35rem', fontSize: '.72rem', color: 'var(--on-ink-muted)' }}>
            Chapters
          </p>
          <ol style={{ listStyle: 'none', margin: '0 0 1.1rem', padding: 0, borderTop: `1px solid ${INK_LINE}` }}>
            {chapters.map((chapter, index) => {
              const isActive = index === currentChapter;
              return (
                <li key={`${chapter.startSec}-${index}`} style={{ borderBottom: `1px solid ${INK_LINE}` }}>
                  <button
                    type="button"
                    onClick={() => handleSeek(chapter.startSec, true)}
                    disabled={!src}
                    aria-current={isActive ? 'true' : undefined}
                    style={{ width: '100%', minHeight: 44, display: 'grid', gridTemplateColumns: '3.2rem 1fr', gap: '.6rem', alignItems: 'center', textAlign: 'left', padding: '.45rem .6rem', border: 0, borderRadius: 6, color: 'var(--on-ink)', background: isActive ? 'rgba(236,233,228,.1)' : 'transparent', opacity: 1 }}
                  >
                    <span style={{ fontFamily: 'var(--f-mono)', fontWeight: 500, fontSize: '.74rem', letterSpacing: '.06em', fontVariantNumeric: 'tabular-nums', color: isActive ? 'var(--accent-on-ink)' : 'var(--on-ink-muted)' }}>
                      {formatClock(chapter.startSec)}
                    </span>
                    <span style={{ fontFamily: 'var(--f-display)', fontWeight: isActive ? 700 : 600, fontSize: '.95rem', color: isActive ? 'var(--accent-on-ink)' : 'var(--on-ink)' }}>
                      {chapter.title}
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        </>
      )}

      {nowLines.length > 0 && (
        <div style={{ borderRadius: 8, background: 'rgba(236,233,228,.06)', padding: '.9rem 1rem' }}>
          <p className="oib-eyebrow" style={{ margin: '0 0 .6rem', fontSize: '.72rem', color: 'var(--accent-on-ink)' }}>
            {chapters[currentChapter] ? `Chapter · ${chapters[currentChapter].title}` : 'Transcript'}
          </p>
          <div style={{ maxHeight: '18rem', overflowY: 'auto' }} tabIndex={0} aria-label="Transcript for this chapter">
            {nowLines.map((line, index) => (
              <div key={index} style={{ display: 'grid', gridTemplateColumns: '2.2rem 1fr', gap: '.6rem', alignItems: 'start', margin: '0 0 .55rem' }}>
                <HostBadge who={line.speaker} />
                <p style={{ fontSize: '1rem', lineHeight: 1.5, color: 'var(--on-ink)' }}>
                  <span className="oib-sr">{line.speaker === 'IN' ? 'Interviewer: ' : 'Analyst: '}</span>
                  {line.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
};
