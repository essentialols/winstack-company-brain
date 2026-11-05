/** In-memory log of pipeline runs. Served at GET /runs and exposed to Triggerware as table `oib_runs`. */
export interface RunRecord {
  run_id: string;
  trigger: 'interval' | 'triggerware' | 'cli' | 'http';
  brain_id: string;
  brain_name: string;
  status: 'running' | 'published' | 'failed' | 'skipped';
  issue_id: string | null;
  issue_number: number | null;
  saves: number;
  takeaways: number;
  audio_sec: number | null;
  error: string | null;
  started_at: string;
  finished_at: string | null;
}

const MAX = 200;
const runs: RunRecord[] = [];

export function startRun(r: Omit<RunRecord, 'run_id' | 'status' | 'issue_id' | 'issue_number' | 'takeaways' | 'audio_sec' | 'error' | 'started_at' | 'finished_at'>): RunRecord {
  const rec: RunRecord = {
    ...r,
    run_id: crypto.randomUUID(),
    status: 'running',
    issue_id: null,
    issue_number: null,
    takeaways: 0,
    audio_sec: null,
    error: null,
    started_at: new Date().toISOString(),
    finished_at: null,
  };
  runs.unshift(rec);
  if (runs.length > MAX) runs.length = MAX;
  return rec;
}

export function finishRun(rec: RunRecord, patch: Partial<RunRecord>): void {
  Object.assign(rec, patch, { finished_at: new Date().toISOString() });
}

export function listRuns(): RunRecord[] {
  return runs;
}
