import type { IssueContent, PodcastLine } from '@app-starter/shared';
import { config, log } from './config.js';
import { parseMp3 } from './mp3.js';

const INSTRUCTIONS = {
  IN: 'You are the host of a short weekly podcast. Curious, warm and conversational. Ask questions naturally, at a relaxed pace.',
  AN: 'You are an analyst explaining things to a colleague. Calm, clear and confident, conversational pace, not salesy.',
} as const;

export function ttsEnabled(): boolean {
  if (config.ttsProvider === 'openai') return !!config.openaiApiKey;
  if (config.ttsProvider === 'elevenlabs') return !!config.elevenApiKey;
  return false;
}

async function openaiSpeech(text: string, speaker: PodcastLine['speaker']): Promise<Buffer> {
  const res = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: { Authorization: `Bearer ${config.openaiApiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: config.openaiTtsModel,
      voice: speaker === 'IN' ? config.openaiVoiceIn : config.openaiVoiceAn,
      input: text,
      response_format: 'mp3',
      // `instructions` is honoured by gpt-4o-mini-tts and ignored by tts-1 models.
      ...(config.openaiTtsModel.startsWith('tts-1') ? {} : { instructions: INSTRUCTIONS[speaker] }),
    }),
  });
  if (!res.ok) throw new Error(`OpenAI TTS ${res.status}: ${(await res.text()).slice(0, 300)}`);
  return Buffer.from(await res.arrayBuffer());
}

async function elevenSpeech(text: string, speaker: PodcastLine['speaker']): Promise<Buffer> {
  const voice = speaker === 'IN' ? config.elevenVoiceIn : config.elevenVoiceAn;
  const res = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voice)}?output_format=mp3_44100_128`,
    {
      method: 'POST',
      headers: { 'xi-api-key': config.elevenApiKey, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
      body: JSON.stringify({ text, model_id: config.elevenModel }),
    },
  );
  if (!res.ok) throw new Error(`ElevenLabs TTS ${res.status}: ${(await res.text()).slice(0, 300)}`);
  return Buffer.from(await res.arrayBuffer());
}

/** Split long lines at sentence boundaries (OpenAI input limit is 4096 chars). */
function chunkText(text: string, max = 3500): string[] {
  if (text.length <= max) return [text];
  const sentences = text.match(/[^.!?]+[.!?]+["')\]]*\s*|[^.!?]+$/g) ?? [text];
  const out: string[] = [];
  let cur = '';
  for (const s of sentences) {
    if ((cur + s).length > max && cur) {
      out.push(cur.trim());
      cur = '';
    }
    cur += s;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

async function speakLine(line: PodcastLine): Promise<Buffer> {
  const synth = config.ttsProvider === 'elevenlabs' ? elevenSpeech : openaiSpeech;
  const parts: Buffer[] = [];
  for (const chunk of chunkText(line.text)) {
    try {
      parts.push(await synth(chunk, line.speaker));
    } catch (err) {
      log.warn('TTS chunk failed, retrying once', err);
      await new Promise((r) => setTimeout(r, 1500));
      parts.push(await synth(chunk, line.speaker));
    }
  }
  return Buffer.concat(parts);
}

async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T, i: number) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i]!, i);
    }
  });
  await Promise.all(workers);
  return results;
}

export interface PodcastAudio {
  audio: Buffer;
  durationSec: number;
  /** podcast with chapter startSec filled in */
  podcast: NonNullable<IssueContent['podcast']>;
}

/**
 * Synthesizes each transcript line with the speaker's voice, concatenates the mp3 frames in order,
 * and derives chapter start times from per-line durations. Throws on failure (caller publishes without audio).
 */
export async function synthesizePodcast(podcast: NonNullable<IssueContent['podcast']>): Promise<PodcastAudio> {
  const started = Date.now();
  const clips = await mapLimit(podcast.transcript, config.ttsConcurrency, async (line) => parseMp3(await speakLine(line)));

  const chapterStart = new Array<number | null>(podcast.chapters.length).fill(null);
  let t = 0;
  podcast.transcript.forEach((line, i) => {
    if (chapterStart[line.chapter] === null) chapterStart[line.chapter] = t;
    t += clips[i]!.durationSec;
  });
  // Chapters without lines inherit the previous chapter's start.
  let prev = 0;
  const chapters = podcast.chapters.map((c, i) => {
    const s = chapterStart[i] ?? prev;
    prev = s;
    return { title: c.title, startSec: Math.round(s * 10) / 10 };
  });

  const audio = Buffer.concat(clips.map((c) => c.audio));
  log.info(
    `TTS (${config.ttsProvider}) ${podcast.transcript.length} lines → ${(audio.length / 1e6).toFixed(1)} MB, ${Math.round(t)}s in ${Math.round((Date.now() - started) / 1000)}s`,
  );
  return { audio, durationSec: Math.round(t), podcast: { ...podcast, chapters } };
}
