# @app-starter/pipeline

The Outside-In Brain issue generator. It turns a brain's pending saves into an issue with up to 5 takeaways and a two-voice podcast. Then it publishes the issue to the API.

```
GET /internal/brains/due ──► Claude (strict JSON, zod-validated, 1 retry)
                         ──► TTS per transcript line (IN / AN voices) ──► mp3 concat + chapter times
                         ──► POST /internal/brains/:id/issues (multipart: payload + audio)
```

## Run locally

```sh
cp apps/pipeline/.env.example apps/pipeline/.env   # fill PIPELINE_SECRET, ANTHROPIC_API_KEY, OPENAI_API_KEY
pnpm --filter @app-starter/pipeline run once --brain <brainId>   # one forced run (demo)
pnpm --filter @app-starter/pipeline run once                      # one normal tick (only due brains)
pnpm --filter @app-starter/pipeline run dev                       # long-running worker
```

`.env` in `apps/pipeline` is loaded automatically; real env vars take precedence. `PIPELINE_SECRET` must match the API's `PIPELINE_SECRET`. `--brain` adds `?force=<id>`, so the API returns that brain even when it is not due.

The worker serves a small HTTP API on `PORT`:

- `GET /health`: liveness check, including Triggerware connection state.
- `GET /runs`: the last 200 runs. Triggerware reads this as table `oib_runs`.
- `POST /run?brain=<id>` with header `X-Pipeline-Secret`: starts a run now.

## How it works

- **Schedule.** An in-process interval runs every `TICK_MINUTES` (default 15). The API decides which brains are due. Ticks never overlap.
- **Triggerware** (optional). If `TRIGGERWARE_URL` is set, the worker connects and sets up:
  - Table `oib_due_brains`. A prompt-defined table whose rows come from `GET /internal/brains/due`. The table config holds `api_url` and `pipeline_secret`.
  - Trigger `oib_digest_check`. It runs `SELECT brain_id, brain_name, pending_saves FROM oib_due_brains` on `TRIGGERWARE_SCHEDULE`. The worker watches it. When a brain becomes due (an added row), Triggerware pushes the row and the worker runs at once.
  - Table `oib_runs`. Only created when `PIPELINE_SELF_URL` is set. It exposes the run log for SQL queries and further triggers in Triggerware.

  If Triggerware is down or setup fails, the worker logs a warning and keeps going on the interval. It retries the connection every 60 s.
- **Claude.** One `messages.stream` call to `ANTHROPIC_MODEL`. The output is parsed and validated with zod (`src/schema.ts`). On failure, the worker retries once and feeds the error back. Takeaways cite `saveIds`, and the worker builds `sources` from the real saves. Quotes that do not appear word for word in a cited save are dropped. Uncited saves go to `alsoSaved`. Each save is capped at about 12k characters, with about 160k characters in total. Videos and podcasts use captions first.
- **TTS.** Each transcript line is spoken in its speaker's voice. Up to `TTS_CONCURRENCY` requests run in parallel. The mp3 frames are concatenated in order, with ID3 and Xing/Info headers stripped. The worker sums frame durations to get exact chapter `startSec` values and `audioDurationSec`. If TTS fails, the issue is published without audio.

## Environment

See `.env.example`. Required: `API_URL`, `PIPELINE_SECRET`, `ANTHROPIC_API_KEY`. For audio, set `OPENAI_API_KEY`, or set `TTS_PROVIDER=elevenlabs` and `ELEVENLABS_API_KEY`.

## Deploy on Railway (pipeline and Triggerware side by side)

1. **Pipeline service.** Create a new service from this repo. Set the root directory to the monorepo root (`app/`) and the config file to `apps/pipeline/railway.json`. It builds `apps/pipeline/Dockerfile`. Add the env vars from `.env.example`. Set `API_URL` to the API's URL (or `http://<api>.railway.internal:<port>/api`).
2. **Triggerware service.** Create a second service in the same project, built from `apps/pipeline/triggerware/Dockerfile`. It installs the server and the `tw` CLI with the official installer:
   ```sh
   curl -fsSL https://tw2-releases.s3.us-east-2.amazonaws.com/install.sh | sh
   curl -fsSL https://tw2-releases.s3.us-east-2.amazonaws.com/cli/install.sh | sh
   triggerware start   # SDK TCP endpoint on :5221
   ```
   Add a volume so Triggerware's table and trigger definitions survive redeploys. Prompt-defined tables need Triggerware's agent provider. Set it once with `triggerware help` or the configuration API (`agent_provider`, `agent_model`, `agent_api_key`).
3. Wire them up over private networking:
   - `TRIGGERWARE_URL=<triggerware-service>.railway.internal:5221`
   - `PIPELINE_SELF_URL=http://<pipeline-service>.railway.internal:${PORT}`, so `oib_runs` can read `/runs`.
   - For a remote, public Triggerware, use a `wss://` URL and set `TRIGGERWARE_API_KEY`.

Locally, run `triggerware start` (macOS/Windows installers are in the tw2-sdks README) and set `TRIGGERWARE_URL=localhost:5221`.
