/**
 * One pipeline tick, then exit.
 *   pnpm --filter @app-starter/pipeline run once                 # all due brains
 *   pnpm --filter @app-starter/pipeline run once --brain <id>    # force this brain (demo)
 */
import { assertConfig, log } from './config.js';
import { tick } from './pipeline.js';

function arg(name: string): string | undefined {
  const argv = process.argv.slice(2);
  const i = argv.indexOf(`--${name}`);
  if (i >= 0) return argv[i + 1];
  const eq = argv.find((a) => a.startsWith(`--${name}=`));
  return eq?.slice(name.length + 3);
}

async function main(): Promise<void> {
  assertConfig();
  const brain = arg('brain');
  const result = await tick('cli', brain);
  log.info(`Done: ${result.published.length} published, ${result.failed.length} failed (of ${result.due} due)`);
  for (const p of result.published) log.info(`  brain ${p.brainId} → issue #${p.number} ${p.issueId}`);
  for (const f of result.failed) log.error(`  brain ${f.brainId}: ${f.error}`);
  process.exit(result.failed.length > 0 ? 1 : 0);
}

main().catch((err) => {
  log.error('once failed', err);
  process.exit(1);
});
