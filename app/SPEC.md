# Outside-In Brain — build spec (single source of truth for all agents)

Outside-In Brain: people save anything they see while browsing (one click in a Chrome extension, or paste a link/text on the website) into a shared "brain" of their workspace. On each brain's schedule (once or twice a week) a pipeline turns everything saved since the last issue into an issue: 5 takeaways with fold-out detail, plus a ~10 min two-voice podcast (AI interviewer "IN" questions AI analyst "AN"). Members get it by email and in-app. Saving is click-only, never automatic.

Monorepo: this `app/` folder is digohq/app-starter (Turborepo + pnpm). Read `AGENTS.md`. Shared contract types: `packages/shared/src/types/brain.ts` (already written — use it, do not change field names; add fields only if unavoidable and say so in your report).

Packages:
- `apps/api` — NestJS + Prisma (owner: API agent). Global prefix `/api`.
- `apps/web` — Next.js App Router (owner: Web agent).
- `apps/extension` — Chrome MV3 extension, plain JS, no build step (owner: Extension agent).
- `apps/pipeline` — Node/TypeScript worker using Triggerware SDK + Claude + TTS (owner: Pipeline agent).
- Designs to port: `design/*.dc.html` (+ `design/BRIEF.md` for tokens). These are the approved mockups in Aaron's visual style (Archivo / Spectral / IBM Plex Mono, accent #c63f1d, dark mode). Match them.

Org = workspace (tenant). Brain replaces the starter's "Projects" example (leave Projects code in place; do not delete it — just stop linking it from the UI).

## Data model (Prisma, API agent writes schema + a hand-written SQL migration `prisma/migrations/0002_outside_in_brain/migration.sql`)

- `Brain`: id uuid, organizationId, createdById, name, slug (unique per org), frequency `DigestFrequency` (ONCE|TWICE, default TWICE), deliveryDays Int[] default {2,6}, deliveryHour Int default 7, timezone String default 'UTC', podcastMinutes Int default 10, lastIssueAt timestamptz?, archivedAt?, createdAt, updatedAt. Map `brains`.
- `Save`: id, organizationId, brainId, createdById, source `SaveSource`, kind `SaveKind`, url?, title, siteName?, text Text?, selection Text?, captions Text?, note?, issueId?, createdAt, deletedAt?. Map `saves`. Index (brainId, issueId, createdAt).
- `Issue`: id, organizationId, brainId, number Int (unique per brain), title, content Json (`IssueContent`), audioKey String? (storage key), audioDurationSec Int?, publishedAt timestamptz default now. Map `issues`.
- `ApiToken`: id, userId, name, prefix (first 8 chars), tokenHash (sha256 hex, unique), lastUsedAt?, createdAt, revokedAt?. Map `api_tokens`. Tokens look like `oib_` + 40 random base62 chars.
- `UserDigestPreference`: userId unique, wantsRead Bool default true, wantsListen Bool default true. Email/in-app channel choice reuses the starter's existing notification preferences.
- When an organization is created (existing flow), also create a default Brain named "My brain" (hook into organizations service; keep it small).

## API endpoints (all under `/api`)

JWT (existing `JwtAuthGuard` + `EmailVerifiedGuard`), tenant-scoped like `projects`:
- `GET /organizations/:orgId/brains` → `BrainDto[]`
- `POST /organizations/:orgId/brains` {name} → `BrainDto`
- `PATCH /organizations/:orgId/brains/:brainId` {name?, frequency?, deliveryDays?, deliveryHour?, timezone?, podcastMinutes?} → `BrainDto`
- `GET /organizations/:orgId/brains/:brainId/saves?pending=true` → `SaveDto[]` newest first (pending = issueId null)
- `POST /organizations/:orgId/brains/:brainId/saves` `CreateSaveInput` → `SaveDto` (source PASTE). If only a URL is given, store it; title = URL host + path; kind inferred.
- `DELETE /organizations/:orgId/brains/:brainId/saves/:saveId` → 204 (soft delete; only pending saves)
- `GET /organizations/:orgId/brains/:brainId/issues` → `IssueSummaryDto[]`
- `GET /organizations/:orgId/issues/:issueId` → `IssueDto` (audioUrl = public/signed URL from the storage provider, or `/api/organizations/:orgId/issues/:issueId/audio` streaming endpoint — API agent chooses; streaming endpoint must accept the JWT cookie the web app already uses)
- `GET /me/digest-preferences`, `PATCH /me/digest-preferences` {wantsRead?, wantsListen?}
- `POST /me/api-tokens` {name} → `{ token: string, apiToken: ApiTokenDto }` (token shown once); `GET /me/api-tokens` → `ApiTokenDto[]`; `DELETE /me/api-tokens/:id`

Extension (accept EITHER JWT OR `Authorization: Bearer oib_…` API token — new `ApiTokenOrJwtGuard` that sets the same `req.user` TokenPayload shape):
- `GET /me/brains` → `MeBrainsDto` (defaultBrainId = most recently used brain of the user, else first brain of first org)
- `POST /saves` `CreateSaveInput` → `SaveDto` (source EXTENSION). Caller must be a member of the brain's org. Body limit for this route: 5 MB (raise json limit in main.ts accordingly, e.g. 6mb globally is fine).
- CORS: allow `chrome-extension://*` origins for these two routes (or globally via env `EXTENSION_ORIGINS`, default allow any `chrome-extension://` origin).

Pipeline (header `X-Pipeline-Secret: $PIPELINE_SECRET`, new `PipelineSecretGuard`, routes not in Swagger public docs):
- `GET /internal/brains/due?now=ISO` → `DueBrainDto[]` — brains whose most recent scheduled slot (per frequency/deliveryDays/deliveryHour/timezone) is after `lastIssueAt` (or brain created before the slot) AND have ≥1 pending save. `?force=brainId` returns that brain regardless of schedule (for demos).
- `POST /internal/brains/:brainId/issues` multipart: field `payload` = JSON `{ title, content: IssueContent, audioDurationSec? }`, optional file `audio` (audio/mpeg, up to 40 MB). Creates Issue with next number, stores audio via the existing storage module, sets `issueId` on every pending save of the brain created ≤ the request time, sets `brain.lastIssueAt = now`, then notifies all org members (email + in-app via the existing notifications module; email links to `${WEB_URL}/issues/:issueId`; respect user notification preferences). Returns `IssueDto`.
- `POST /internal/brains/:brainId/run` → 202; just records nothing — reserved (skip if short on time).

## Web app (`apps/web`)

Port the designs to real Next.js pages, keeping Aaron's look (fonts via next/font/google: Archivo, Spectral, IBM Plex Mono; CSS variables from design/BRIEF.md incl. dark mode). Tailwind is available; plain CSS modules or a global stylesheet for the editorial tokens is fine. Pages:
- `/` Home, `/how-it-works`, `/pricing` (public marketing, from Home/HowItWorks/Pricing.dc.html). "Add to Chrome" → `/extension`.
- Auth: keep the starter's login/register/OTP/Google logic; restyle `/login` (and register if trivial) toward SignIn.dc.html. After first login, `/get-started` (starter's onboarding) is fine; then dashboard.
- `/dashboard` → brain inbox (Dashboard.dc.html): sidebar (workspace, brains list + new brain, All issues, Members → starter's org members page, Settings), paste box (textarea → POST saves), pending saves list with delete, schedule controls (frequency, podcast length) → PATCH brain, format toggles → PATCH /me/digest-preferences, recent issues → `/issues/[id]`. Use the starter's existing org context/hooks to know the current org.
- `/issues/[id]` → issue view (Main.dc.html): podcast player using a real `<audio>` element with chapter buttons that seek to `startSec`, transcript lines for current chapter, speed 1×/1.5×/2×; 5 takeaways with expand/collapse all; visuals (table | grid | bars) rendered from `IssueVisual`; "What to do with this"; source links (open `url` in new tab); also-saved list. Hide the player when `audioUrl` is null.
- `/extension` → "Connect the extension": explains install (load unpacked from `apps/extension` during the hackathon; Chrome Web Store link placeholder), button "Create extension key" → POST /me/api-tokens, shows the token once with a copy button and the API base URL to paste into the extension, lists/revokes existing keys.
- Remove or unlink the starter's demo landing content so `/` is ours.

## Extension (`apps/extension`, MV3, no build step)

Files: `manifest.json`, `popup.html`, `popup.css`, `popup.js`, `background.js` (service worker), `content.js` (extraction), `options.html`, `options.js`, `icons/` (simple SVG→PNG not required; use an svg-free placeholder: generate 16/48/128 PNGs is optional — manifest may omit icons).
- Permissions: `activeTab`, `scripting`, `storage`, `contextMenus`. Host permissions: none required beyond activeTab; API calls go to the configured API base URL (add `optional_host_permissions: ["https://*/*", "http://localhost/*"]` and request the API origin on first save).
- Options: API base URL (default `http://localhost:3001/api`) + extension key (`oib_…`) from the web `/extension` page; "Test connection" calls `GET /me/brains`.
- Popup (Extension.dc.html design): shows current tab domain + title + detected kind; brain chips from `/me/brains` (remember last picked in storage); optional note; "Save to brain" → extract via `chrome.scripting.executeScript` (content.js logic: page title, `og:site_name`, selection, main text via a light readability heuristic (largest text-dense container, strip nav/footer/aside/script), capped 200k chars; on youtube.com/watch run in MAIN world to read `ytInitialPlayerResponse.captions.playerCaptionsTracklistRenderer.captionTracks`, prefer English/auto, fetch `baseUrl + '&fmt=json3'`, join segment text into `captions`); PDFs: send URL only with kind PDF) → `POST /saves` → confirmation state ("Saved to X · It goes into <day>'s issue") with Undo (DELETE via org/brain route needs orgId: `/me/brains` gives it) and "Open dashboard" (web URL derived: options field "Web app URL", default `http://localhost:3000`).
- Context menu "Save to Outside-In Brain" (page / selection / link) and command `Alt+Shift+S` save directly to the last-used brain from background.js with a badge "✓" for 2s.
- Not configured → popup shows a short "Connect your account" state linking to the web `/extension` page and options.

## Pipeline (`apps/pipeline`, Node 22 + TypeScript, runs on Railway next to a Triggerware server)

Read `/home/claude/ref/tw2-sdks/node` (README + src) for the Triggerware Node SDK (`triggerware` on npm). Use Triggerware for what it is good at:
- On start: connect (`TRIGGERWARE_URL` tcp host:port, or ws URL + `TRIGGERWARE_API_KEY`), ensure a table for saves/issue runs (e.g. `oib_runs` log of runs) and register whatever trigger/agent is practical. If the SDK supports time-based triggers, use one to fire the digest check every 15 min; otherwise use a simple interval in-process and still record runs/saves in a Triggerware table. Keep Triggerware optional at runtime: if `TRIGGERWARE_URL` is unset or connect fails, log a warning and continue (so the demo never blocks on it).
- Every tick: `GET /internal/brains/due` → for each due brain: build the issue with Claude (`@anthropic-ai/sdk`, model from `ANTHROPIC_MODEL`, default `claude-sonnet-5-5`): one call producing strict JSON `IssueContent` (group related saves, exactly 5 takeaways when ≥5 distinct ideas, fewer otherwise; each takeaway cites `saveId`s; visuals only when they help; podcast transcript ~`podcastMinutes*150` words alternating IN/AN with chapters matching takeaways). Validate the JSON (zod), retry once on failure. Truncate each save's text to fit (~12k chars per save, captions preferred for videos).
- TTS: real two voices. Provider via `TTS_PROVIDER` = `openai` (default; `OPENAI_API_KEY`, `TTS_MODEL` default `gpt-4o-mini-tts`, `TTS_VOICE_IN` default `alloy`, `TTS_VOICE_AN` default `onyx`) or `elevenlabs` (`ELEVENLABS_API_KEY`, `ELEVENLABS_VOICE_IN`, `ELEVENLABS_VOICE_AN`). Synthesize each transcript line as mp3, concatenate buffers in order, compute chapter `startSec` from per-line durations (estimate from byte length at the provider's bitrate if needed), compute total duration. If TTS fails, publish without audio.
- `POST /internal/brains/:id/issues` multipart with payload + audio.
- CLI: `pnpm --filter pipeline run once [--brain <id>]` runs one tick (with force for that brain) — used for the demo.
- Env: `API_URL` (e.g. https://api.example.com/api), `PIPELINE_SECRET`, `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL`, TTS vars, `TRIGGERWARE_URL`, `TRIGGERWARE_API_KEY`, `TICK_MINUTES` (default 15). Provide `.env.example`, `Dockerfile`, `railway.json`, README.

## Deploy targets
Web → Vercel (`apps/web`). API → Railway (Dockerfile in apps/api if the starter has none). Postgres → Supabase (`DATABASE_URL`, `DIRECT_URL` if needed). Redis → Railway. Pipeline + Triggerware server → Railway. Storage → starter's local/R2 provider (use R2/S3 in prod). New env vars: API `PIPELINE_SECRET`, `WEB_URL`, `EXTENSION_ORIGINS`.

## Rules for all agents
- Speed over polish. Write complete, working code in one pass. Minimal testing: do NOT run pnpm install, builds, dev servers or test suites — the lead runs one install + type-check at the end. Do not write new unit tests unless trivial.
- Only edit files in your own package (plus, for the API agent: `packages/shared` only if unavoidable). Web must call the API exactly as specified above.
- Do not commit or push. Report: files changed, any contract deviations, env vars added, anything left TODO.
