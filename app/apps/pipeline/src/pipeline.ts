import type { DueBrainDto, IssueContent } from '@app-starter/shared';
import { getDueBrains, publishIssue } from './api.js';
import { log } from './config.js';
import { finishRun, startRun, type RunRecord } from './runs.js';
import { synthesizePodcast, ttsEnabled } from './tts.js';
import { toIssueContent, writeDraft } from './writer.js';

export type TickTrigger = RunRecord['trigger'];

export interface TickResult {
  due: number;
  published: { brainId: string; issueId: string; number: number }[];
  failed: { brainId: string; error: string }[];
}

let running: Promise<TickResult> | null = null;
let rerun: { trigger: TickTrigger; force?: string } | null = null;

/** Runs one tick; concurrent calls coalesce (one follow-up tick is queued if a tick is already running). */
export function tick(trigger: TickTrigger, force?: string): Promise<TickResult> {
  if (running) {
    rerun = { trigger, force: force ?? rerun?.force };
    return running;
  }
  running = runTick(trigger, force).finally(() => {
    running = null;
    if (rerun) {
      const next = rerun;
      rerun = null;
      void tick(next.trigger, next.force);
    }
  });
  return running;
}

async function runTick(trigger: TickTrigger, force?: string): Promise<TickResult> {
  const result: TickResult = { due: 0, published: [], failed: [] };
  let due: DueBrainDto[];
  try {
    due = await getDueBrains({ force });
  } catch (err) {
    log.error('Could not fetch due brains', err);
    throw err;
  }
  result.due = due.length;
  log.info(`Tick (${trigger}${force ? `, force=${force}` : ''}): ${due.length} brain(s) due`);

  // Sequential on purpose: keeps Claude/TTS rate limits and memory predictable.
  for (const d of due) {
    const run = startRun({ trigger, brain_id: d.brain.id, brain_name: d.brain.name, saves: d.saves.length });
    try {
      if (d.saves.length === 0) {
        finishRun(run, { status: 'skipped', error: 'no pending saves' });
        continue;
      }
      const issue = await buildAndPublish(d);
      finishRun(run, {
        status: 'published',
        issue_id: issue.issueId,
        issue_number: issue.number,
        takeaways: issue.takeaways,
        audio_sec: issue.audioSec,
      });
      result.published.push({ brainId: d.brain.id, issueId: issue.issueId, number: issue.number });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      log.error(`Brain ${d.brain.id} (${d.brain.name}) failed`, msg);
      finishRun(run, { status: 'failed', error: msg.slice(0, 1000) });
      result.failed.push({ brainId: d.brain.id, error: msg });
    }
  }
  return result;
}

async function buildAndPublish(d: DueBrainDto): Promise<{ issueId: string; number: number; takeaways: number; audioSec: number | null }> {
  const t0 = Date.now();
  log.info(`Brain ${d.brain.name}: writing issue #${d.nextIssueNumber} from ${d.saves.length} save(s)`);
  const draft = await writeDraft(d);
  let content: IssueContent = toIssueContent(draft, d);
  log.info(`Brain ${d.brain.name}: draft ready (${content.takeaways.length} takeaways) in ${Math.round((Date.now() - t0) / 1000)}s`);

  let audio: Buffer | null = null;
  let audioDurationSec: number | undefined;
  if (content.podcast && ttsEnabled()) {
    try {
      const out = await synthesizePodcast(content.podcast);
      audio = out.audio;
      audioDurationSec = out.durationSec;
      content = { ...content, podcast: out.podcast };
    } catch (err) {
      log.warn(`Brain ${d.brain.name}: TTS failed, publishing without audio`, err);
    }
  } else if (content.podcast) {
    log.warn('TTS not configured; publishing without audio');
  }

  const issue = await publishIssue(d.brain.id, { title: content.title, content, audioDurationSec, audio });
  log.info(`Brain ${d.brain.name}: published issue #${issue.number} (${issue.id}) in ${Math.round((Date.now() - t0) / 1000)}s`);
  return { issueId: issue.id, number: issue.number, takeaways: content.takeaways.length, audioSec: audioDurationSec ?? null };
}
