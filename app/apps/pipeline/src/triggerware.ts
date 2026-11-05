import { TriggerwareClient, type Row } from 'triggerware';
import { config, log } from './config.js';

/**
 * Triggerware integration (optional at runtime).
 *
 * Triggerware tables are generator-backed (code or a natural-language prompt produces the rows), and
 * triggers are scheduled SQL queries whose added/deleted rows are pushed to watchers. We use that as:
 *
 *  - table   `oib_due_brains`: rows = brains that are due now, fetched from GET /internal/brains/due
 *  - trigger `oib_digest_check`: `SELECT … FROM oib_due_brains` on TRIGGERWARE_SCHEDULE; when a brain
 *            appears (added row) Triggerware pushes it to us and we run the pipeline immediately
 *  - table   `oib_runs` (if PIPELINE_SELF_URL is set): the worker's run log, queryable from Triggerware
 *
 * The in-process interval keeps running as a safety net, so nothing depends on Triggerware being up.
 */

export const DUE_TABLE = 'oib_due_brains';
export const RUNS_TABLE = 'oib_runs';
export const TRIGGER = 'oib_digest_check';

const DUE_PROMPT = `Table of Outside-In Brain "brains" that are due for a new digest issue right now.
Fetch the rows with an HTTP GET request to "{api_url}/internal/brains/due" with the request header
"X-Pipeline-Secret: {pipeline_secret}". Both api_url and pipeline_secret come from this table's configuration
(config schema: api_url string required; pipeline_secret string required, secret).
The response body is a JSON array; each element looks like
{"brain": {"id": string, "name": string, "organizationName": string, "lastIssueAt": string|null}, "saves": [ ... ], "nextIssueNumber": number}.
Return one row per element with these columns:
brain_id (text) = brain.id; brain_name (text) = brain.name; organization_name (text) = brain.organizationName;
pending_saves (integer) = number of items in saves; next_issue_number (integer) = nextIssueNumber.
Return no rows if the array is empty. The table has no inputs.`;

const RUNS_PROMPT = `Table of Outside-In Brain pipeline runs (the issue generator's run log).
Fetch the rows with an HTTP GET request to "{runs_url}" (runs_url comes from this table's configuration;
config schema: runs_url string required). The response is a JSON array of objects; return one row per object with columns
run_id (text), trigger (text), brain_id (text), brain_name (text), status (text), issue_id (text), issue_number (integer),
saves (integer), takeaways (integer), audio_sec (integer), error (text), started_at (text), finished_at (text),
taking each column from the object field of the same name (null when missing). The table has no inputs.`;

export type WakeHandler = (reason: string, brainIds: string[]) => void;

export class TriggerwareBridge {
  private client: TriggerwareClient | null = null;
  private stopped = false;
  private reconnectTimer: NodeJS.Timeout | null = null;

  constructor(private readonly onWake: WakeHandler) {}

  get connected(): boolean {
    return this.client !== null;
  }

  async start(): Promise<void> {
    if (!config.triggerwareUrl) {
      log.warn('TRIGGERWARE_URL not set; running on the in-process interval only');
      return;
    }
    try {
      this.client = await this.connect();
      const health = await this.client.system.health();
      log.info(`Triggerware connected (${config.triggerwareUrl}), health: ${health.status}`);
      this.client.waitClosed().then(
        () => this.handleClosed(),
        () => this.handleClosed(),
      );
    } catch (err) {
      log.warn(`Triggerware connect failed (${config.triggerwareUrl}); continuing without it`, err);
      this.client = null;
      this.scheduleReconnect();
      return;
    }
    await this.setup();
  }

  private async connect(): Promise<TriggerwareClient> {
    const url = config.triggerwareUrl;
    if (/^wss?:\/\//i.test(url)) return TriggerwareClient.connectWs(url, config.triggerwareApiKey);
    return TriggerwareClient.connectTcp(url.replace(/^tcp:\/\//i, ''));
  }

  private async setup(): Promise<void> {
    const tw = this.client;
    if (!tw) return;

    let tables: string[] = [];
    try {
      tables = await tw.tables.list();
    } catch (err) {
      log.warn('Triggerware tables.list failed', err);
    }

    const dueOk = await this.ensureTable(tw, tables, DUE_TABLE, DUE_PROMPT, {
      api_url: config.apiUrl,
      pipeline_secret: config.pipelineSecret,
    });
    if (config.pipelineSelfUrl) {
      await this.ensureTable(tw, tables, RUNS_TABLE, RUNS_PROMPT, { runs_url: `${config.pipelineSelfUrl}/runs` });
    }
    if (!dueOk) return;

    try {
      const triggers = await tw.triggers.list();
      const def = {
        description: 'Fires when an Outside-In Brain brain becomes due for a new issue.',
        sql: `SELECT brain_id, brain_name, pending_saves FROM ${DUE_TABLE}`,
        schedule: config.triggerwareSchedule,
        reportNoops: false,
        enabled: true,
      };
      if (triggers.includes(TRIGGER)) await tw.triggers.update(TRIGGER, def);
      else await tw.triggers.create({ name: TRIGGER, ...def });

      await tw.triggers.watch(TRIGGER, (added: Row[]) => {
        if (added.length === 0) return;
        const ids = added.map((r) => String(r[0]));
        log.info(`Triggerware ${TRIGGER}: ${added.length} brain(s) became due`);
        this.onWake('triggerware', ids);
      });
      log.info(`Triggerware trigger ${TRIGGER} watching (schedule "${config.triggerwareSchedule}")`);
    } catch (err) {
      log.warn(`Triggerware trigger ${TRIGGER} setup failed; interval keeps running`, err);
    }
  }

  private async ensureTable(
    tw: TriggerwareClient,
    existing: string[],
    name: string,
    prompt: string,
    tableConfig: Record<string, string>,
  ): Promise<boolean> {
    try {
      if (!existing.includes(name)) {
        log.info(`Triggerware: creating table ${name}`);
        await tw.tables.create({ name, prompt });
      }
      await tw.tables.configure(name, { config: tableConfig });
      return true;
    } catch (err) {
      log.warn(`Triggerware table ${name} setup failed`, err);
      return false;
    }
  }

  private handleClosed(): void {
    if (this.stopped) return;
    log.warn('Triggerware connection closed');
    this.client = null;
    this.scheduleReconnect();
  }

  private scheduleReconnect(): void {
    if (this.stopped || this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      void this.start();
    }, 60_000);
  }

  async stop(): Promise<void> {
    this.stopped = true;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    const c = this.client;
    this.client = null;
    if (c) await c.close().catch(() => undefined);
  }
}
