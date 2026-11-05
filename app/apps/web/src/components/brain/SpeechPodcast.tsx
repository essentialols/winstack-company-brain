'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { IssueContent } from '@app-starter/shared';

type Podcast = NonNullable<IssueContent['podcast']>;

const pickVoices = (voices: SpeechSynthesisVoice[]) => {
  const english = voices.filter((v) => v.lang.toLowerCase().startsWith('en'));
  const pool = english.length >= 2 ? english : voices;
  // Prefer two clearly different voices; fall back to one voice at two pitches.
  const first = pool[0] ?? null;
  const second = pool.find((v) => v !== first && v.name.split(' ')[0] !== first?.name.split(' ')[0]) ?? pool[1] ?? first;
  return { interviewer: first, analyst: second };
};

/**
 * Plays an issue's two-host script in the browser with the Web Speech API.
 * Used when an issue has a transcript but no rendered mp3 (the demo), so the
 * conversation is still heard in two voices without any TTS service.
 */
export const SpeechPodcast = ({ podcast }: { podcast: Podcast }) => {
  const lines = podcast.transcript;
  const [isSupported, setIsSupported] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [lineIndex, setLineIndex] = useState(0);
  const [rate, setRate] = useState(1);
  const voicesRef = useRef<{ interviewer: SpeechSynthesisVoice | null; analyst: SpeechSynthesisVoice | null }>({
    interviewer: null,
    analyst: null,
  });
  const playingRef = useRef(false);
  const rateRef = useRef(1);

  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      setIsSupported(false);
      return;
    }
    const load = () => {
      voicesRef.current = pickVoices(window.speechSynthesis.getVoices());
    };
    load();
    window.speechSynthesis.addEventListener('voiceschanged', load);
    return () => {
      window.speechSynthesis.removeEventListener('voiceschanged', load);
      window.speechSynthesis.cancel();
    };
  }, []);

  const speakFrom = useCallback(
    (start: number) => {
      const synth = window.speechSynthesis;
      synth.cancel();
      if (start >= lines.length) {
        playingRef.current = false;
        setIsPlaying(false);
        setLineIndex(0);
        return;
      }
      const line = lines[start];
      const utterance = new SpeechSynthesisUtterance(line.text);
      const isInterviewer = line.speaker === 'IN';
      const voice = isInterviewer ? voicesRef.current.interviewer : voicesRef.current.analyst;
      if (voice) utterance.voice = voice;
      // If both hosts got the same voice, pitch still tells them apart.
      utterance.pitch = isInterviewer ? 1.15 : 0.85;
      utterance.rate = rateRef.current;
      utterance.onend = () => {
        if (!playingRef.current) return;
        setLineIndex(start + 1);
        speakFrom(start + 1);
      };
      setLineIndex(start);
      synth.speak(utterance);
    },
    [lines],
  );

  const handlePlay = () => {
    if (isPlaying) {
      playingRef.current = false;
      setIsPlaying(false);
      window.speechSynthesis.cancel();
      return;
    }
    playingRef.current = true;
    setIsPlaying(true);
    speakFrom(lineIndex);
  };

  const handleChapter = (chapter: number) => {
    const start = Math.max(0, lines.findIndex((l) => l.chapter === chapter));
    playingRef.current = true;
    setIsPlaying(true);
    speakFrom(start);
  };

  const handleRate = (next: number) => {
    rateRef.current = next;
    setRate(next);
    if (playingRef.current) speakFrom(lineIndex);
  };

  if (!lines.length) return null;
  const current = lines[Math.min(lineIndex, lines.length - 1)];
  const currentChapter = current?.chapter ?? 0;
  const nowPlaying = lines.filter((l) => l.chapter === currentChapter).slice(0, 4);
  const progress = Math.round((lineIndex / lines.length) * 100);

  return (
    <section aria-label="Podcast player" className="oib-ink" style={{ borderRadius: 12, padding: '1.4rem 1.25rem 1.25rem', margin: '0 0 2.25rem' }}>
      <p className="oib-eyebrow" style={{ margin: '0 0 .45rem', color: 'var(--accent-on-ink)' }}>
        Listen instead · two voices
      </p>
      <h2 style={{ margin: '0 0 .35rem', fontSize: '1.35rem', lineHeight: 1.2 }}>{podcast.title || 'This issue, as a conversation'}</h2>
      <p style={{ margin: 0, fontSize: '1rem', lineHeight: 1.5, color: 'var(--on-ink-muted)' }}>
        An AI interviewer questions an AI analyst about this issue. Read aloud by your browser&apos;s voices.
      </p>

      {!isSupported ? (
        <p role="alert" style={{ margin: '1rem 0 0', color: 'var(--accent-on-ink)' }}>
          This browser can&apos;t read text aloud. Try Chrome or Safari.
        </p>
      ) : (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: '.9rem', margin: '1.25rem 0 .9rem' }}>
            <button
              type="button"
              onClick={handlePlay}
              aria-label={isPlaying ? 'Pause' : 'Play'}
              style={{ flex: '0 0 auto', width: '3rem', height: '3rem', borderRadius: 999, border: 0, background: 'var(--accent-on-ink)', color: 'var(--ink)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
            >
              {isPlaying ? (
                <svg width="18" height="18" viewBox="0 0 20 20" aria-hidden="true"><rect x="4" y="3" width="4" height="14" rx="1" fill="currentColor" /><rect x="12" y="3" width="4" height="14" rx="1" fill="currentColor" /></svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 20 20" aria-hidden="true"><path d="M6 3.5v13l11-6.5z" fill="currentColor" /></svg>
              )}
            </button>
            <div style={{ flex: '1 1 auto', minWidth: 0 }}>
              <div style={{ height: 6, borderRadius: 3, background: 'rgba(255,255,255,.18)', overflow: 'hidden' }}>
                <div style={{ width: `${progress}%`, height: 6, background: 'var(--accent-on-ink)' }} />
              </div>
              <div style={{ marginTop: '.35rem', fontFamily: 'var(--f-mono)', fontSize: '.74rem', letterSpacing: '.06em', color: 'var(--on-ink-muted)' }}>
                Line {Math.min(lineIndex + 1, lines.length)} of {lines.length}
              </div>
            </div>
          </div>

          <div role="group" aria-label="Playback speed" style={{ display: 'flex', gap: '.4rem', margin: '0 0 1.1rem' }}>
            {[1, 1.25, 1.5].map((value) => (
              <button
                key={value}
                type="button"
                aria-pressed={rate === value}
                onClick={() => handleRate(value)}
                style={{ minWidth: 44, minHeight: 36, borderRadius: 999, cursor: 'pointer', fontFamily: 'var(--f-display)', fontWeight: 600, border: '1px solid rgba(255,255,255,.3)', background: rate === value ? 'var(--on-ink)' : 'transparent', color: rate === value ? 'var(--ink)' : 'var(--on-ink)' }}
              >
                {value}×
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.25rem' }}>
            <ol style={{ flex: '1 1 14rem', listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '.2rem' }}>
              {podcast.chapters.map((chapter, index) => (
                <li key={index}>
                  <button
                    type="button"
                    onClick={() => handleChapter(index)}
                    aria-current={index === currentChapter ? 'true' : undefined}
                    style={{ width: '100%', textAlign: 'left', minHeight: 44, padding: '.45rem .6rem', borderRadius: 8, border: 0, cursor: 'pointer', fontFamily: 'var(--f-display)', fontWeight: index === currentChapter ? 700 : 500, background: index === currentChapter ? 'rgba(255,255,255,.12)' : 'transparent', color: 'var(--on-ink)' }}
                  >
                    {index + 1}. {chapter.title}
                  </button>
                </li>
              ))}
            </ol>
            <div style={{ flex: '1 1 16rem', display: 'flex', flexDirection: 'column', gap: '.7rem' }} aria-live="polite">
              {nowPlaying.map((line, index) => (
                <p key={index} style={{ margin: 0, fontSize: '.98rem', lineHeight: 1.5, color: line === current ? 'var(--on-ink)' : 'var(--on-ink-muted)' }}>
                  <strong style={{ fontFamily: 'var(--f-mono)', fontSize: '.72rem', marginRight: '.5rem', color: line.speaker === 'IN' ? 'var(--accent-on-ink)' : '#8fb3ff' }}>
                    {line.speaker === 'IN' ? 'INTERVIEWER' : 'ANALYST'}
                  </strong>
                  {line.text}
                </p>
              ))}
            </div>
          </div>
        </>
      )}
    </section>
  );
};
