import type { CreateSaveInput, IssueDto, SaveDto, SaveKind } from '@app-starter/shared';

/**
 * Storage for the no-login demo. It has no database: saves live in process
 * memory (globalThis survives Next dev hot reloads). When SUPABASE_URL and
 * SUPABASE_SERVICE_ROLE_KEY are set, saves go to the `demo_saves` table through
 * Supabase's REST API instead, so a Vercel deployment keeps them across
 * instances. See app/DEMO.md for the one-line table SQL.
 */

export const DEMO_ORG_ID = 'demo';
export const DEMO_BRAIN_ID = 'demo';
const MAX_TEXT = 200_000;
const MAX_SAVES = 200;

export interface DemoSave extends SaveDto {
  text: string | null;
  selection: string | null;
  captions: string | null;
}

interface MemoryState {
  saves: DemoSave[];
  issue: IssueDto | null;
}

const memory = (): MemoryState => {
  const g = globalThis as typeof globalThis & { __oibDemo?: MemoryState };
  if (!g.__oibDemo) g.__oibDemo = { saves: [], issue: null };
  return g.__oibDemo;
};

const supabase = () => {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return url && key ? { url: url.replace(/\/+$/, ''), key } : null;
};

const sbFetch = async (path: string, init: RequestInit = {}) => {
  const sb = supabase();
  if (!sb) throw new Error('Supabase not configured');
  const res = await fetch(`${sb.url}/rest/v1/${path}`, {
    ...init,
    cache: 'no-store',
    headers: {
      apikey: sb.key,
      Authorization: `Bearer ${sb.key}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
      ...(init.headers ?? {}),
    },
  });
  if (!res.ok) throw new Error(`Supabase ${res.status}: ${await res.text()}`);
  return res.status === 204 ? null : res.json();
};

const clip = (value: string | undefined | null, max = MAX_TEXT) =>
  value ? value.slice(0, max) : null;

const inferKind = (input: CreateSaveInput): SaveKind => {
  if (input.kind) return input.kind;
  const url = input.url ?? '';
  if (/youtube\.com\/watch|youtu\.be\//i.test(url)) return 'VIDEO';
  if (/\.pdf($|\?)/i.test(url)) return 'PDF';
  if (/(twitter|x|bsky|threads|linkedin)\.(com|app|net)/i.test(url)) return 'POST';
  if (input.selection) return 'SNIPPET';
  if (url) return 'ARTICLE';
  return 'TEXT';
};

const titleFor = (input: CreateSaveInput) => {
  if (input.title?.trim()) return input.title.trim().slice(0, 300);
  if (input.url) {
    try {
      const u = new URL(input.url);
      const videoId = u.hostname.includes('youtu') ? u.searchParams.get('v') ?? u.pathname.slice(1) : null;
      if (videoId) return `YouTube video ${videoId}`;
      return `${u.hostname}${u.pathname === '/' ? '' : u.pathname}`.slice(0, 300);
    } catch {
      return input.url.slice(0, 300);
    }
  }
  const text = (input.text ?? input.selection ?? '').trim();
  return text ? `${text.slice(0, 80)}${text.length > 80 ? '…' : ''}` : 'Untitled save';
};

const excerptFor = (input: CreateSaveInput) =>
  (input.selection ?? input.text ?? input.captions ?? input.note ?? '').replace(/\s+/g, ' ').trim().slice(0, 200);

/** Accepts a bare URL pasted into the text box as the save's url. */
const normalize = (input: CreateSaveInput): CreateSaveInput => {
  const text = input.text?.trim();
  if (!input.url && text && /^https?:\/\/\S+$/i.test(text)) return { ...input, url: text, text: undefined };
  return input;
};

export const toPublicSave = (save: DemoSave): SaveDto => {
  const { text: _text, selection: _selection, captions: _captions, ...rest } = save;
  return rest;
};

export const listSaves = async (): Promise<DemoSave[]> => {
  if (supabase()) {
    const rows = (await sbFetch(`demo_saves?select=data&order=created_at.desc&limit=${MAX_SAVES}`)) as { data: DemoSave }[];
    return rows.map((row) => row.data);
  }
  return [...memory().saves];
};

/** Best-effort page title for a pasted bare link (YouTube via oEmbed, else <title>). */
const fetchTitle = async (url: string): Promise<string | null> => {
  try {
    const signal = AbortSignal.timeout(3500);
    if (/youtube\.com\/watch|youtu\.be\//i.test(url)) {
      const res = await fetch(`https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(url)}`, { signal });
      if (res.ok) {
        const data = (await res.json()) as { title?: string; author_name?: string };
        if (data.title) return data.author_name ? `${data.title} · ${data.author_name}` : data.title;
      }
      return null;
    }
    const res = await fetch(url, { signal, headers: { 'User-Agent': 'Mozilla/5.0 OutsideInBrainDemo' } });
    if (!res.ok || !(res.headers.get('content-type') ?? '').includes('text/html')) return null;
    const html = (await res.text()).slice(0, 200_000);
    const match = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i) ?? html.match(/<title[^>]*>([^<]+)<\/title>/i);
    return match ? match[1].replace(/\s+/g, ' ').trim().slice(0, 300) : null;
  } catch {
    return null;
  }
};

export const createSave = async (raw: CreateSaveInput, source: 'EXTENSION' | 'PASTE'): Promise<DemoSave> => {
  const normalized = normalize(raw);
  const fetchedTitle = normalized.url && !normalized.title?.trim() ? await fetchTitle(normalized.url) : null;
  const input = fetchedTitle ? { ...normalized, title: fetchedTitle } : normalized;
  if (!input.url && !input.text?.trim() && !input.selection?.trim() && !input.captions?.trim()) {
    throw new Error('Add a link or some text to save.');
  }
  const save: DemoSave = {
    id: crypto.randomUUID(),
    brainId: DEMO_BRAIN_ID,
    source,
    kind: inferKind(input),
    url: clip(input.url, 2000),
    title: titleFor(input),
    siteName: clip(input.siteName, 200),
    excerpt: excerptFor(input),
    note: clip(input.note, 2000),
    issueId: null,
    createdBy: { id: 'demo', name: source === 'EXTENSION' ? 'Extension' : 'Pasted' },
    createdAt: new Date().toISOString(),
    text: clip(input.text),
    selection: clip(input.selection, 20_000),
    captions: clip(input.captions),
  };
  if (supabase()) {
    await sbFetch('demo_saves', { method: 'POST', body: JSON.stringify({ id: save.id, data: save }) });
    return save;
  }
  const state = memory();
  state.saves = [save, ...state.saves].slice(0, MAX_SAVES);
  return save;
};

export const deleteSave = async (id: string): Promise<boolean> => {
  if (supabase()) {
    const rows = (await sbFetch(`demo_saves?id=eq.${encodeURIComponent(id)}`, { method: 'DELETE' })) as unknown[];
    return rows.length > 0;
  }
  const state = memory();
  const before = state.saves.length;
  state.saves = state.saves.filter((s) => s.id !== id);
  return state.saves.length < before;
};

/** Latest generated issue lives in memory only; it can always be regenerated. */
export const getGeneratedIssue = () => memory().issue;
export const setGeneratedIssue = (issue: IssueDto) => {
  memory().issue = issue;
};
