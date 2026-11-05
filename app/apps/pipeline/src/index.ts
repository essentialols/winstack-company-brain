import { createServer } from 'node:http';
import { assertConfig, config, log } from './config.js';
import { tick } from './pipeline.js';
import { listRuns } from './runs.js';
import { TriggerwareBridge } from './triggerware.js';

assertConfig();

const bridge = new TriggerwareBridge((reason) => {
  void tick('triggerware').catch((err) => log.error(`Tick from ${reason} failed`, err));
});

// Small HTTP server: Railway health check, run log (also the source of Triggerware table oib_runs),
// and a manual kick for demos.
const server = createServer((req, res) => {
  const url = new URL(req.url ?? '/', 'http://localhost');
  const json = (status: number, body: unknown) => {
    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(body));
  };
  if (req.method === 'GET' && url.pathname === '/health') {
    return json(200, { ok: true, triggerware: bridge.connected });
  }
  if (req.method === 'GET' && url.pathname === '/runs') {
    return json(200, listRuns());
  }
  if (req.method === 'POST' && url.pathname === '/run') {
    if (req.headers['x-pipeline-secret'] !== config.pipelineSecret) return json(401, { error: 'unauthorized' });
    const brain = url.searchParams.get('brain') ?? undefined;
    void tick('http', brain).catch((err) => log.error('Manual tick failed', err));
    return json(202, { accepted: true, brain: brain ?? null });
  }
  json(404, { error: 'not found' });
});
server.listen(config.port, () => log.info(`Pipeline HTTP on :${config.port} (/health, /runs, POST /run)`));

const intervalMs = config.tickMinutes * 60_000;
const timer = setInterval(() => {
  void tick('interval').catch((err) => log.error('Interval tick failed', err));
}, intervalMs);

log.info(`Pipeline worker started: API ${config.apiUrl}, tick every ${config.tickMinutes} min, TTS ${config.ttsProvider}`);
void bridge.start();
void tick('interval').catch((err) => log.error('Initial tick failed', err));

async function shutdown(signal: string): Promise<void> {
  log.info(`${signal} received, shutting down`);
  clearInterval(timer);
  server.close();
  await bridge.stop();
  process.exit(0);
}
process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));
