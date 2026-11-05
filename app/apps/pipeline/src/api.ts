import type { DueBrainDto, IssueContent, IssueDto } from '@app-starter/shared';
import { config } from './config.js';

function headers(): Record<string, string> {
  return { 'X-Pipeline-Secret': config.pipelineSecret };
}

async function failText(res: Response): Promise<string> {
  const body = await res.text().catch(() => '');
  return `${res.status} ${res.statusText}${body ? `: ${body.slice(0, 500)}` : ''}`;
}

function unwrap<T>(json: unknown): T {
  // Tolerate a `{ data: ... }` envelope in case the API adds one.
  if (json && typeof json === 'object' && !Array.isArray(json) && 'data' in json) {
    return (json as { data: T }).data;
  }
  return json as T;
}

export async function getDueBrains(opts: { now?: Date; force?: string } = {}): Promise<DueBrainDto[]> {
  const url = new URL(`${config.apiUrl}/internal/brains/due`);
  url.searchParams.set('now', (opts.now ?? new Date()).toISOString());
  if (opts.force) url.searchParams.set('force', opts.force);
  const res = await fetch(url, { headers: headers() });
  if (!res.ok) throw new Error(`GET /internal/brains/due failed: ${await failText(res)}`);
  return unwrap<DueBrainDto[]>(await res.json()) ?? [];
}

export interface PublishInput {
  title: string;
  content: IssueContent;
  audioDurationSec?: number;
  audio?: Buffer | null;
}

export async function publishIssue(brainId: string, input: PublishInput): Promise<IssueDto> {
  const form = new FormData();
  form.set(
    'payload',
    JSON.stringify({ title: input.title, content: input.content, audioDurationSec: input.audioDurationSec }),
  );
  if (input.audio && input.audio.length > 0) {
    form.set('audio', new Blob([new Uint8Array(input.audio)], { type: 'audio/mpeg' }), 'issue.mp3');
  }
  const res = await fetch(`${config.apiUrl}/internal/brains/${encodeURIComponent(brainId)}/issues`, {
    method: 'POST',
    headers: headers(), // fetch sets the multipart boundary itself
    body: form,
  });
  if (!res.ok) throw new Error(`POST /internal/brains/${brainId}/issues failed: ${await failText(res)}`);
  return unwrap<IssueDto>(await res.json());
}
