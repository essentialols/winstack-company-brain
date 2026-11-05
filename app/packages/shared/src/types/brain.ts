// Outside-In Brain shared contract. Used by api, web, extension (copied as JSON shape) and pipeline.

export type SaveSource = 'EXTENSION' | 'PASTE';
export type SaveKind = 'ARTICLE' | 'VIDEO' | 'PODCAST' | 'PDF' | 'POST' | 'SNIPPET' | 'TEXT' | 'IMAGE' | 'OTHER';
export type DigestFrequency = 'ONCE' | 'TWICE';

export interface BrainDto {
  id: string;
  organizationId: string;
  name: string;
  slug: string;
  frequency: DigestFrequency;
  /** 0 = Sunday … 6 = Saturday. ONCE uses deliveryDays[0]. Default [2, 6] (Tue, Sat). */
  deliveryDays: number[];
  /** Local hour 0-23 in `timezone`. Default 7. */
  deliveryHour: number;
  timezone: string;
  podcastMinutes: number; // 5 | 10 | 15
  lastIssueAt: string | null;
  pendingSaveCount: number;
  nextIssueAt: string | null;
  createdAt: string;
}

export interface CreateSaveInput {
  brainId?: string; // omitted → caller's default brain
  source?: SaveSource; // server sets EXTENSION for API-token calls, PASTE for web
  kind?: SaveKind; // server infers if omitted
  url?: string;
  title?: string;
  siteName?: string;
  text?: string; // main page text or pasted text, max 200k chars
  selection?: string; // highlighted text
  captions?: string; // video transcript
  note?: string;
}

export interface SaveDto {
  id: string;
  brainId: string;
  source: SaveSource;
  kind: SaveKind;
  url: string | null;
  title: string;
  siteName: string | null;
  excerpt: string; // first ~200 chars of text/selection/captions
  note: string | null;
  issueId: string | null;
  createdBy: { id: string; name: string | null };
  createdAt: string;
}

/** Full save as given to the pipeline. */
export interface PipelineSave extends SaveDto {
  text: string | null;
  selection: string | null;
  captions: string | null;
}

export type IssueVisual =
  | { type: 'table'; caption?: string; columns: string[]; rows: string[][] }
  | { type: 'grid'; caption?: string; cells: { title: string; sub: string }[] }
  | { type: 'bars'; caption?: string; unit?: string; bars: { label: string; value: number; highlight?: boolean }[] };

export interface IssueSourceRef {
  saveId: string;
  title: string;
  url: string | null;
  savedBy?: string | null;
}

export interface IssueTakeaway {
  title: string; // bold lead sentence, e.g. "Ship governance, not just access."
  line: string; // one plain sentence after it
  heading: string; // h3 inside the detail
  detail: string[]; // paragraphs
  quote?: { text: string; cite: string };
  visual?: IssueVisual;
  todo: string; // "What to do with this"
  sources: IssueSourceRef[];
}

export interface PodcastLine {
  speaker: 'IN' | 'AN'; // interviewer | analyst
  text: string;
  chapter: number; // index into chapters
}

export interface IssueContent {
  eyebrow: string; // e.g. "AI tooling · built from 4 things you saved"
  title: string;
  lead: string;
  takeaways: IssueTakeaway[]; // exactly 5 when there is enough material, fewer otherwise
  alsoSaved: { saveId: string; title: string; note: string }[];
  podcast: {
    title: string;
    chapters: { title: string; startSec: number }[];
    transcript: PodcastLine[];
  } | null;
}

export interface IssueDto {
  id: string;
  brainId: string;
  organizationId: string;
  number: number;
  title: string;
  content: IssueContent;
  audioUrl: string | null;
  audioDurationSec: number | null;
  publishedAt: string;
}

export interface IssueSummaryDto {
  id: string;
  number: number;
  title: string;
  takeawayCount: number;
  audioDurationSec: number | null;
  publishedAt: string;
}

/** Returned by GET /api/me/brains (JWT or API token) — used by the extension. */
export interface MeBrainsDto {
  user: { id: string; name: string | null; email: string };
  defaultBrainId: string | null;
  organizations: { id: string; name: string; brains: { id: string; name: string; pendingSaveCount: number; nextIssueAt: string | null }[] }[];
}

export interface ApiTokenDto {
  id: string;
  name: string;
  prefix: string; // first 8 chars for display
  lastUsedAt: string | null;
  createdAt: string;
}

/** Due brain handed to the pipeline. */
export interface DueBrainDto {
  brain: BrainDto & { organizationName: string };
  saves: PipelineSave[];
  nextIssueNumber: number;
}
