import type { IssueContent, IssueDto, PodcastLine } from '@app-starter/shared';
import type { DemoSave } from './demo-store';

const MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-5-5';
const PER_SAVE_CHARS = 8_000;

const SYSTEM = `You write "Outside-In Brain" issues: a weekly brief built ONLY from the items a team saved while browsing.
Return ONLY a JSON object, no prose, matching this TypeScript type:
{
  "eyebrow": string,            // e.g. "Demo brain · built from 4 things you saved"
  "title": string,              // headline naming the 1-2 biggest themes, under 80 chars
  "lead": string,               // 1-2 sentences on what the saves add up to
  "takeaways": Array<{          // 5 when there are 5+ distinct ideas, otherwise one per idea; group related saves
    "title": string,            // bold lead sentence, imperative or claim, ends with "."
    "line": string,             // one plain sentence after it
    "heading": string,          // short h3 for the detail
    "detail": string[],         // 1-3 short paragraphs, plain language
    "todo": string,             // "What to do with this": one concrete next step starting with a verb
    "saveIds": string[]         // ids of the saves this takeaway is built from
  }>,
  "podcast": {
    "title": string,
    "chapters": Array<{ "title": string }>,   // one per takeaway, same order
    "transcript": Array<{ "speaker": "IN" | "AN", "text": string, "chapter": number }>
  }
}
Rules: never invent facts that are not in the saves; say less rather than guess. The podcast is a natural conversation:
IN (interviewer) asks short, curious questions, AN (analyst) explains in 1-3 sentences. About 2 lines per chapter plus a 1-line intro and outro.`;

const formatSave = (save: DemoSave) => {
  const body = (save.captions || save.text || save.selection || save.excerpt || '').slice(0, PER_SAVE_CHARS);
  return [
    `<save id="${save.id}" kind="${save.kind}" source="${save.source}">`,
    `title: ${save.title}`,
    save.url ? `url: ${save.url}` : '',
    save.note ? `note from saver: ${save.note}` : '',
    body ? `content:\n${body}` : '',
    '</save>',
  ]
    .filter(Boolean)
    .join('\n');
};

interface DraftTakeaway {
  title: string;
  line: string;
  heading: string;
  detail: string[];
  todo: string;
  saveIds: string[];
}

interface Draft {
  eyebrow: string;
  title: string;
  lead: string;
  takeaways: DraftTakeaway[];
  podcast: { title: string; chapters: { title: string }[]; transcript: PodcastLine[] } | null;
}

const toContent = (draft: Draft, saves: DemoSave[]): IssueContent => {
  const byId = new Map(saves.map((s) => [s.id, s]));
  const cited = new Set<string>();
  const takeaways = (draft.takeaways ?? []).slice(0, 5).map((t) => {
    const ids = (t.saveIds ?? []).filter((id) => byId.has(id));
    ids.forEach((id) => cited.add(id));
    return {
      title: t.title,
      line: t.line,
      heading: t.heading,
      detail: Array.isArray(t.detail) ? t.detail : [String(t.detail ?? '')],
      todo: t.todo,
      sources: ids.map((id) => ({ saveId: id, title: byId.get(id)!.title, url: byId.get(id)!.url })),
    };
  });
  return {
    eyebrow: draft.eyebrow,
    title: draft.title,
    lead: draft.lead,
    takeaways,
    alsoSaved: saves
      .filter((s) => !cited.has(s.id))
      .map((s) => ({ saveId: s.id, title: s.title, note: s.excerpt || s.note || '' })),
    podcast: draft.podcast
      ? {
          title: draft.podcast.title,
          chapters: (draft.podcast.chapters ?? []).map((c) => ({ title: c.title, startSec: 0 })),
          transcript: (draft.podcast.transcript ?? []).filter((l) => l && (l.speaker === 'IN' || l.speaker === 'AN')),
        }
      : null,
  };
};

const extractJson = (text: string) => {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start < 0 || end <= start) throw new Error('No JSON in model reply');
  return JSON.parse(text.slice(start, end + 1));
};

const writeWithClaude = async (saves: DemoSave[]): Promise<Draft> => {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY as string,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 8000,
      system: SYSTEM,
      messages: [{ role: 'user', content: `Here are the ${saves.length} saves:\n\n${saves.map(formatSave).join('\n\n')}` }],
    }),
  });
  if (!res.ok) throw new Error(`Claude ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const data = (await res.json()) as { content?: { type: string; text?: string }[] };
  const text = (data.content ?? []).map((c) => c.text ?? '').join('');
  return extractJson(text) as Draft;
};

/** Works with no API key at all: one takeaway per save, and a short scripted conversation. */
const writeWithoutModel = (saves: DemoSave[]): Draft => {
  const picked = saves.slice(0, 5);
  const takeaways: DraftTakeaway[] = picked.map((s) => ({
    title: `${s.title.replace(/[.!?]?$/, '.')}`,
    line: s.excerpt ? `${s.excerpt.slice(0, 160)}${s.excerpt.length > 160 ? '…' : ''}` : 'Saved without text — open the source to read it.',
    heading: s.siteName || s.kind.charAt(0) + s.kind.slice(1).toLowerCase(),
    detail: [
      (s.captions || s.text || s.selection || s.excerpt || 'No text was captured for this save.').replace(/\s+/g, ' ').slice(0, 600),
      ...(s.note ? [`Why it was saved: ${s.note}`] : []),
    ],
    todo: 'Open the source and decide whether it changes anything you are working on this week.',
    saveIds: [s.id],
  }));
  const transcript: PodcastLine[] = [
    { speaker: 'IN', text: `This week the brain collected ${saves.length} thing${saves.length === 1 ? '' : 's'}. What stood out?`, chapter: 0 },
  ];
  takeaways.forEach((t, i) => {
    transcript.push({ speaker: 'IN', text: i === 0 ? `Start with "${t.title.replace(/\.$/, '')}".` : `Next one: "${t.title.replace(/\.$/, '')}". Why did it make the list?`, chapter: i });
    transcript.push({ speaker: 'AN', text: t.line, chapter: i });
  });
  transcript.push({ speaker: 'AN', text: 'That is the issue. Everything links back to what you saved.', chapter: Math.max(0, takeaways.length - 1) });
  return {
    eyebrow: `Demo brain · built from ${saves.length} thing${saves.length === 1 ? '' : 's'} you saved · drafted without AI`,
    title: picked[0] ? `This week: ${picked[0].title}` : 'This week in your brain',
    lead: 'A quick draft straight from your saves. With a Claude API key on the server, related saves are grouped into five takeaways with detail and next steps.',
    takeaways,
    podcast: { title: 'Two voices, one week of saves', chapters: takeaways.map((t) => ({ title: t.title })), transcript },
  };
};

export const buildDemoIssue = async (saves: DemoSave[], previousNumber: number): Promise<IssueDto> => {
  const usable = saves.slice(0, 30);
  let draft: Draft;
  if (process.env.ANTHROPIC_API_KEY) {
    try {
      draft = await writeWithClaude(usable);
    } catch (error) {
      console.error('Demo issue: Claude failed, using fallback', error);
      draft = writeWithoutModel(usable);
    }
  } else {
    draft = writeWithoutModel(usable);
  }
  const content = toContent(draft, usable);
  return {
    id: `demo-${Date.now()}`,
    brainId: 'demo',
    organizationId: 'demo',
    number: previousNumber + 1,
    title: content.title,
    content,
    audioUrl: null,
    audioDurationSec: null,
    publishedAt: new Date().toISOString(),
  };
};
