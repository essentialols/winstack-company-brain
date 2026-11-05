import type { BrainDto, SaveDto, SaveKind } from '@app-starter/shared';

const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;
const DAY_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const;

const KIND_LABEL: Record<SaveKind, string> = {
  ARTICLE: 'Article',
  VIDEO: 'Video',
  PODCAST: 'Podcast',
  PDF: 'PDF',
  POST: 'Post',
  SNIPPET: 'Highlight',
  TEXT: 'Text',
  IMAGE: 'Image',
  OTHER: 'Page',
};

export const kindLabel = (kind: SaveKind): string => KIND_LABEL[kind] ?? 'Page';

export const formatClock = (totalSeconds: number): string => {
  const safe = Math.max(0, Math.floor(totalSeconds || 0));
  return `${Math.floor(safe / 60)}:${String(safe % 60).padStart(2, '0')}`;
};

export const formatListenMinutes = (seconds: number | null): string | null =>
  seconds ? `${Math.max(1, Math.round(seconds / 60))} min listen` : null;

/** "Sat 7:00" in the viewer's locale/timezone. */
export const formatIssueSlot = (iso: string | null): string | null => {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  const time = date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  return `${DAY_SHORT[date.getDay()]} ${time}`;
};

export const formatNextIssueDay = (iso: string | null): string | null => {
  if (!iso) return null;
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : DAY_LONG[date.getDay()];
};

export const formatShortDate = (iso: string): string => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
};

export const formatSaveDay = (iso: string): string => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const today = new Date();
  if (date.toDateString() === today.toDateString()) return 'Today';
  const ageDays = (today.getTime() - date.getTime()) / 86_400_000;
  if (ageDays < 6) return DAY_SHORT[date.getDay()];
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

const hourLabel = (hour: number): string => {
  const date = new Date(2000, 0, 1, hour, 0);
  return date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
};

/** "Delivered Tuesday and Saturday at 7:00 AM (Europe/Berlin)". */
export const deliveryLine = (brain: BrainDto): string => {
  const days =
    brain.frequency === 'ONCE' ? brain.deliveryDays.slice(0, 1) : brain.deliveryDays.slice(0, 2);
  const names = days.map((day) => DAY_LONG[day] ?? '?');
  const dayText = names.length > 1 ? `${names[0]} and ${names[1]}` : (names[0] ?? 'weekly');
  return `Delivered ${dayText} at ${hourLabel(brain.deliveryHour)} (${brain.timezone})`;
};

export const hostOf = (url: string | null): string | null => {
  if (!url) return null;
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
};

export const saveMeta = (save: SaveDto): string =>
  [
    save.siteName || hostOf(save.url),
    kindLabel(save.kind),
    save.source === 'EXTENSION' ? 'Extension' : 'Pasted',
    save.createdBy.name,
    formatSaveDay(save.createdAt),
  ]
    .filter(Boolean)
    .join(' · ');

const URL_ONLY = /^https?:\/\/\S+$/i;

/** A paste that is a single URL is saved as a link, anything else as text. */
export const isUrlOnly = (value: string): boolean => URL_ONLY.test(value.trim());
