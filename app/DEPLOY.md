# Deploying Outside-In Brain

Run everything from this `app/` folder. The pieces and where they run:

| Piece | Folder | Host |
| --- | --- | --- |
| Web app | `apps/web` | Vercel |
| API | `apps/api` | Railway, built from `apps/api/Dockerfile`, which runs `prisma migrate deploy` on start |
| Postgres | — | Supabase |
| Redis | — | Railway |
| Digest pipeline | `apps/pipeline` | Railway, built from `apps/pipeline/Dockerfile` |
| Triggerware server | `apps/pipeline/triggerware/Dockerfile` | Railway (optional; the pipeline falls back to its own timer) |
| Chrome extension | `apps/extension` | Load unpacked in Chrome |

## 1. Database (Supabase)
Create a project and copy the Postgres connection string (with the pooler disabled for migrations) into the API's `DATABASE_URL`.

## 2. API (Railway)
New service from this repo. In its settings, pick the Dockerfile builder, use the repo root `app/` as the build context, and set the Dockerfile path to `apps/api/Dockerfile`. Add a Redis service and set the env vars below. Set everything from `apps/api/.env.example`, plus:
- `DATABASE_URL`, `REDIS_URL`
- `PIPELINE_SECRET`: a long random string, shared with the pipeline
- `WEB_URL`: the Vercel URL
- `EXTENSION_ORIGINS`: empty to allow any `chrome-extension://` origin
- Storage: configure R2 or S3 (see the starter's `docs/providers.md`), because podcast mp3s stored on local disk are lost on redeploy
- An SMTP provider for email

## 3. Web (Vercel)
Import the repo with root directory `app/apps/web`. Set `NEXT_PUBLIC_API_URL` to the Railway API URL, without the `/api` suffix.

## 4. Pipeline (Railway)
New service with Dockerfile `apps/pipeline/Dockerfile` and build context `app/`. Set these env vars:
- `API_URL` (`https://<api>/api`)
- `PIPELINE_SECRET`
- `ANTHROPIC_API_KEY`
- `TTS_PROVIDER` with `OPENAI_API_KEY`, or the `ELEVENLABS_*` keys
- Optional: `TRIGGERWARE_URL` and `TRIGGERWARE_API_KEY`

For a demo, publish an issue right away with:
`pnpm --filter @app-starter/pipeline run once -- --brain <brainId>`

## 5. Extension
1. In Chrome, open `chrome://extensions`, turn on Developer mode, choose Load unpacked, and select `apps/extension`.
2. On the web app's `/extension` page, create a key.
3. Paste the key and the API URL into the extension's options.

## Not verified yet
- The API is type-checked except for Prisma models, because the Prisma engines couldn't be downloaded in the build sandbox. Run `pnpm --filter @app-starter/api exec prisma generate && pnpm verify` locally first.
- The Triggerware table and trigger setup uses guessed formats that the SDK doesn't document. Check the pipeline logs on first start.
