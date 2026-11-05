import Anthropic from '@anthropic-ai/sdk';
import type { DueBrainDto, IssueContent, IssueTakeaway, PipelineSave } from '@app-starter/shared';
import { config, log } from './config.js';
import { SYSTEM_PROMPT, buildUserPrompt } from './prompt.js';
import { draftIssueSchema, type DraftIssue } from './schema.js';

let client: Anthropic | null = null;
function anthropic(): Anthropic {
  client ??= new Anthropic({ apiKey: config.anthropicApiKey });
  return client;
}

function extractJson(text: string): unknown {
  const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '');
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start < 0 || end <= start) throw new Error('No JSON object in model output');
  return JSON.parse(cleaned.slice(start, end + 1));
}

async function callClaude(messages: Anthropic.MessageParam[]): Promise<string> {
  const stream = anthropic().messages.stream({
    model: config.anthropicModel,
    max_tokens: config.anthropicMaxTokens,
    system: SYSTEM_PROMPT,
    messages,
  });
  const msg = await stream.finalMessage();
  if (msg.stop_reason === 'max_tokens') log.warn('Claude hit max_tokens; JSON may be truncated');
  return msg.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('');
}

function parseDraft(text: string): DraftIssue {
  const parsed = draftIssueSchema.safeParse(extractJson(text));
  if (!parsed.success) {
    const issues = parsed.error.issues
      .slice(0, 12)
      .map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`)
      .join('; ');
    throw new Error(`Schema validation failed: ${issues}`);
  }
  return parsed.data;
}

/** One Claude call producing the draft; on parse/validation failure, one retry with the error fed back. */
export async function writeDraft(due: DueBrainDto): Promise<DraftIssue> {
  const messages: Anthropic.MessageParam[] = [{ role: 'user', content: buildUserPrompt(due) }];
  const first = await callClaude(messages);
  try {
    return parseDraft(first);
  } catch (err) {
    log.warn(`Draft for brain ${due.brain.id} invalid, retrying once`, err);
    const retry = await callClaude([
      ...messages,
      { role: 'assistant', content: first.slice(0, 60_000) || '{}' },
      {
        role: 'user',
        content: `That output could not be used: ${(err as Error).message}\nReturn the complete, corrected issue as a single valid JSON object only — no prose, no code fences. Keep to the same rules (only facts from the saves, exact saveIds).`,
      },
    ]);
    return parseDraft(retry);
  }
}

const norm = (s: string) =>
  s
    .toLowerCase()
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, ' ')
    .trim();

function saveHaystack(s: PipelineSave): string {
  return norm([s.title, s.note, s.selection, s.text, s.captions].filter(Boolean).join(' \n '));
}

/** Turn the validated draft into the shared IssueContent, resolving saveIds and dropping unverifiable quotes. */
export function toIssueContent(draft: DraftIssue, due: DueBrainDto): IssueContent {
  const byId = new Map(due.saves.map((s) => [s.id, s]));
  const cited = new Set<string>();

  const takeaways: IssueTakeaway[] = draft.takeaways.map((t) => {
    const saves = [...new Set(t.saveIds)].map((id) => byId.get(id)).filter((s): s is PipelineSave => !!s);
    saves.forEach((s) => cited.add(s.id));
    const out: IssueTakeaway = {
      title: t.title,
      line: t.line,
      heading: t.heading,
      detail: t.detail,
      todo: t.todo,
      sources: saves.map((s) => ({ saveId: s.id, title: s.title, url: s.url, savedBy: s.createdBy?.name ?? null })),
    };
    if (t.quote) {
      const needle = norm(t.quote.text).replace(/^["']|["']$/g, '');
      const pool = saves.length ? saves : due.saves;
      if (needle.length > 0 && pool.some((s) => saveHaystack(s).includes(needle))) out.quote = t.quote;
      else log.debug(`Dropped non-verbatim quote: "${t.quote.text.slice(0, 80)}"`);
    }
    if (t.visual) out.visual = t.visual;
    return out;
  });

  // alsoSaved: keep the model's notes for real, uncited saves; add any uncited save it forgot.
  const alsoSaved: IssueContent['alsoSaved'] = [];
  const seen = new Set<string>();
  for (const a of draft.alsoSaved) {
    const s = byId.get(a.saveId);
    if (!s || cited.has(s.id) || seen.has(s.id)) continue;
    seen.add(s.id);
    alsoSaved.push({ saveId: s.id, title: s.title, note: a.note });
  }
  for (const s of due.saves) {
    if (cited.has(s.id) || seen.has(s.id)) continue;
    alsoSaved.push({ saveId: s.id, title: s.title, note: s.siteName ?? s.excerpt?.slice(0, 140) ?? '' });
  }

  let podcast: IssueContent['podcast'] = null;
  if (draft.podcast && draft.podcast.transcript.length > 0) {
    const nCh = draft.podcast.chapters.length;
    podcast = {
      title: draft.podcast.title,
      chapters: draft.podcast.chapters.map((c) => ({ title: c.title, startSec: 0 })),
      transcript: draft.podcast.transcript
        .filter((l) => l.text.trim().length > 0)
        .map((l) => ({ speaker: l.speaker, text: l.text.trim(), chapter: Math.min(Math.max(0, l.chapter), nCh - 1) })),
    };
  }

  return { eyebrow: draft.eyebrow, title: draft.title, lead: draft.lead, takeaways, alsoSaved, podcast };
}
