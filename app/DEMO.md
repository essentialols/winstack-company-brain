# No-login demo

The demo needs only the web app. It doesn't use the API, Postgres, Redis or the pipeline, and it has no sign-in.

## Run it locally (about 1 minute)

```
cd app
pnpm install
pnpm --filter @app-starter/web exec next dev -p 3100
```

Open http://localhost:3100. The pages to show:

- `/`: the landing page. "Try it now, no sign-up" goes to the demo.
- `/sample-issue`: a finished issue with five takeaways. Press play to hear the two-voice conversation, read aloud by the browser.
- `/demo`: the demo brain. Paste links or text, or save from the extension, then click **Build this week's issue**.
- `/demo/issue`: the issue built from your saves, with the same two-voice player.

## Extension in demo mode

1. Load `app/apps/extension` unpacked in Chrome.
2. In its settings, leave **Extension key** empty.
3. Set **Web app URL** to `http://localhost:3100` (or your Vercel URL), then click **Save** and allow access when Chrome asks.
4. Click the extension on any page, or press Alt+Shift+S. The save shows up on `/demo` within about 5 seconds.

## Optional settings (environment variables for the web app)

- `ANTHROPIC_API_KEY` (and optionally `ANTHROPIC_MODEL`): Claude writes the issue, grouping saves into up to five takeaways with detail, next steps and a podcast script. Without it, the demo builds a simple draft, one takeaway per save.
- `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`: keep saves in Supabase so they survive restarts and work across Vercel instances. Otherwise saves live in server memory and reset when the server restarts. To set it up, create the table once:

  ```sql
  create table if not exists demo_saves (
    id uuid primary key,
    data jsonb not null,
    created_at timestamptz not null default now()
  );
  ```

## Deploy the demo to Vercel

Import the repo with root directory `app/apps/web`. Optionally add the variables above. No other services are needed.
