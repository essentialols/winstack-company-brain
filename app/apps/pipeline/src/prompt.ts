import type { DueBrainDto, PipelineSave } from '@app-starter/shared';

const PER_SAVE_MAX = 12_000;
const TOTAL_MAX = 160_000;

function clip(text: string, max: number): string {
  const t = text.replace(/\s+\n/g, '\n').replace(/[ \t]{2,}/g, ' ').trim();
  return t.length <= max ? t : `${t.slice(0, max)} …[truncated]`;
}

/** Best body for a save: captions for video/podcast, else page text. Selection and note go first. */
export function saveBody(save: PipelineSave, max: number): string {
  const parts: string[] = [];
  if (save.note) parts.push(`Saver's note: ${save.note}`);
  if (save.selection) parts.push(`Highlighted by the saver:\n${clip(save.selection, Math.min(4000, max))}`);
  const preferCaptions = save.kind === 'VIDEO' || save.kind === 'PODCAST';
  const main = preferCaptions ? save.captions || save.text : save.text || save.captions;
  const used = parts.join('\n\n').length;
  if (main) parts.push(`${preferCaptions && save.captions ? 'Transcript' : 'Content'}:\n${clip(main, Math.max(1000, max - used))}`);
  if (!main && !save.selection) parts.push('(Only the link was saved; no text is available. Use only the title and URL.)');
  return parts.join('\n\n');
}

export const SYSTEM_PROMPT = `You are the editor of "Outside-In Brain", a short internal newsletter. A team saves articles, videos, podcasts, posts and snippets they find while browsing. On a schedule (once or twice a week) you turn everything saved since the last issue into one issue: a handful of plain-language takeaways and a script for a two-voice audio episode.

Ground rules (these matter more than anything else):
- Use ONLY what is in the saves below. Never add facts, numbers, names, dates, quotes or claims that are not in a save. If a save is only a link with a title, you may mention it only at the level of its title. When unsure, leave it out.
- Every takeaway cites the saveIds it draws on (exact ids from the input). Group related saves into one takeaway.
- A quote is optional and only allowed if its text appears word for word in one of the cited saves. Otherwise omit the quote field.
- Write for a busy colleague: plain words, short sentences, active voice, no hype, no jargon unless the saves use it and you explain it. No emojis, no exclamation marks, no "In today's fast-paced world".

Issue shape:
- eyebrow: "<topic> · built from <N> things you saved" (N = number of saves you used).
- title: a crisp line that names what this week adds up to (max ~10 words).
- lead: 1–2 sentences: what was saved (by kind, e.g. "two podcast episodes and a slide photo") and that here is what it adds up to.
- takeaways: exactly 5 when the saves contain at least 5 distinct ideas; otherwise fewer (never pad, never split one idea to reach 5). Order by importance.
  Each takeaway:
  - title: the bold lead sentence. A short claim or instruction ending with a period, e.g. "Ship governance, not just access." or "Memory is the missing layer for agents."
  - line: ONE plain sentence that explains the title.
  - heading: a short heading for the fold-out detail, e.g. "Why Stripe built Kai".
  - detail: 1–3 short paragraphs (2–4 sentences each) with the specifics from the saves: who, what, how, numbers.
  - quote (optional): { text, cite } — verbatim from a cited save; cite = speaker or source name.
  - visual (optional, only when it truly helps — at most two in the issue): a "table" (2–4 columns, ≤6 rows) for comparisons, a "grid" (2–6 cells of title + short sub) for a set of named things, or "bars" (numbers that are actually in the saves) for quantities.
  - todo: one concrete action the reader can take this week, starting with a verb, e.g. "List the rules your company already runs on…".
  - saveIds: ids of the saves it draws on.
- alsoSaved: saves that did not make it into any takeaway, each { saveId, title, note } where note is one sentence on what it is about.

Podcast (the "podcast" object):
- A natural conversation between two voices: IN, a curious interviewer who asks short, pointed questions, and AN, an analyst who explains clearly with specifics from the saves. IN asks, AN answers; IN may follow up, push back or summarise. Speak like people, not like a document: contractions, short sentences, no lists, no markdown, no stage directions, no sound effects, no names for the hosts.
- Chapters = takeaways: one chapter per takeaway, same order, chapter title = a short form of the takeaway title. Every transcript line carries "chapter" (0-based index into chapters). Lines are in order and chapters do not interleave.
- Open with one short IN line that introduces what this issue covers (part of chapter 0). End with a short closing exchange in the last chapter.
- Length target is given below in words; split it roughly evenly across chapters. Keep each line under ~70 words. Alternate speakers; never two IN lines in a row.
- Spell out numbers, symbols and abbreviations the way they should be spoken when it helps ("ten thousand", "A to A") — the script is read by text-to-speech.
- The same no-invention rule applies: the analyst only states what the saves say.

Output: a single JSON object, nothing before or after it, no code fences. Shape:
{
  "eyebrow": string,
  "title": string,
  "lead": string,
  "takeaways": [{ "title": string, "line": string, "heading": string, "detail": string[], "quote"?: { "text": string, "cite": string }, "visual"?: Visual, "todo": string, "saveIds": string[] }],
  "alsoSaved": [{ "saveId": string, "title": string, "note": string }],
  "podcast": { "title": string, "chapters": [{ "title": string }], "transcript": [{ "speaker": "IN" | "AN", "text": string, "chapter": number }] }
}
Visual is one of:
  { "type": "table", "caption"?: string, "columns": string[], "rows": string[][] }
  { "type": "grid", "caption"?: string, "cells": [{ "title": string, "sub": string }] }
  { "type": "bars", "caption"?: string, "unit"?: string, "bars": [{ "label": string, "value": number, "highlight"?: boolean }] }`;

export function buildUserPrompt(due: DueBrainDto): string {
  const { brain, saves } = due;
  const perSave = Math.max(2000, Math.min(PER_SAVE_MAX, Math.floor(TOTAL_MAX / Math.max(1, saves.length))));
  const words = Math.max(300, (brain.podcastMinutes || 10) * 150);
  const blocks = saves.map((s, i) => {
    const meta = [
      `saveId: ${s.id}`,
      `kind: ${s.kind}`,
      `title: ${s.title}`,
      s.siteName ? `site: ${s.siteName}` : null,
      s.url ? `url: ${s.url}` : null,
      `saved by: ${s.createdBy?.name ?? 'a teammate'} on ${s.createdAt.slice(0, 10)}`,
    ]
      .filter(Boolean)
      .join('\n');
    return `<save index="${i + 1}">\n${meta}\n\n${saveBody(s, perSave)}\n</save>`;
  });
  return [
    `Workspace: ${brain.organizationName}`,
    `Brain: ${brain.name}`,
    `Issue number: ${due.nextIssueNumber}`,
    `Number of saves: ${saves.length}`,
    `Podcast length target: about ${words} words in total (~${brain.podcastMinutes || 10} minutes).`,
    '',
    'The saves:',
    '',
    blocks.join('\n\n'),
    '',
    'Write the issue now. Return only the JSON object.',
  ].join('\n');
}
