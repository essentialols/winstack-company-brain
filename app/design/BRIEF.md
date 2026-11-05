# Outside-In Brain — page brief (shared by all page writers)

## Product
Outside-In Brain: save anything you come across while browsing (article, YouTube video, podcast page, PDF, social post, a highlighted snippet) with ONE CLICK in a Chrome extension, or paste a link / any text on the website. Everything saved lands in a "brain" (optional folders like "AI tooling", "Design"). Once or twice a week (scheduled digest, no per-item processing) it sends an issue: five TL;DR takeaways that fold out into ~1 page of detail (with a chart where useful, "What to do with this", and links to the saved sources), plus a ~10 min real two-voice podcast where an AI interviewer questions an AI analyst. Shared workspaces (household/team) with Owner/Admin/Member roles; each member picks email and/or in-app delivery and read/listen formats.
Saving is on click only, never automatic (privacy).

Stack (for How it works page): Chrome extension (Manifest V3, runs in your browser) → Digo app-starter (digohq/app-starter): Next.js web app on Vercel, NestJS + Prisma API on Railway, Postgres on Supabase, Redis on Railway, auth (email code, Google), orgs & roles, email + in-app notifications → Triggerware (triggerware/tw2-sdks) server on Railway: saves land in Triggerware tables; a scheduled trigger fires at each brain's delivery time; an agent (Claude API) groups related saves and writes the issue + two-host script; a text-to-speech service renders two voices ([TTS PROVIDER]); app-starter delivers by email ([EMAIL PROVIDER]) and in-app.

## Copy rules
No invented stats, no lorem ipsum. Missing facts → placeholders like [PRICE], [N]. Sample content is labelled "Sample". Plain, direct, warm copy. Icons: inline stroke SVG, never emoji.

## Visual design — keep Aaron's design exactly (editorial reading-list style)
Fonts (Google Fonts link, put in <helmet>):
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wght@600;700;800&amp;family=Spectral:ital,wght@0,400;0,600;1,400&amp;family=IBM+Plex+Mono:wght@500&amp;display=swap">
- Display/UI/headings/buttons: Archivo 800 (h1 clamp(1.9rem,6vw,2.6rem)/1.1, letter-spacing -.015em; on marketing hero up to 3.2rem), 700/600 for labels and buttons.
- Body: Spectral 400, 1.0625–1.125rem / 1.6.
- Eyebrows, metadata, sources, counts: IBM Plex Mono 500, .72–.8rem, letter-spacing .08em, UPPERCASE for eyebrows, color var(--muted).
- Numbered items: number in Archivo 800, accent color, tabular-nums, in a 2.6rem column.
- Rows separated by 1px var(--rule) lines; hover rows get var(--hover) background, radius 8px.
- Open/expanded detail: summary row gets var(--box) background + 1px var(--box-line) border, radius 8px. Detail indented 2.75rem: h3 Archivo 800 1.3rem; blockquote with 3px accent left border, italic; "What to do with this" box = var(--chip) background, radius 6px, label in Archivo 600 .8rem uppercase accent.
- Pill buttons: Archivo 600 .85rem, 1px var(--rule) border, radius 999px, transparent; hover border+text accent. Primary button: accent background, white text, radius 999px, Archivo 700.
- Reading column max-width 42rem; marketing pages may use a 64rem container but keep the editorial single-column feel, generous whitespace, few boxes, no gradients, no shadows except a very subtle one on the extension popup / browser mock.
- Dark blocks (podcast player, CTA band): background var(--ink), text var(--on-ink), accent var(--accent-on-ink).

Put exactly this token block in each page's <helmet><style> (plus body{margin:0}):
:root{--bg:#ffffff;--fg:#23211f;--muted:#6c6862;--rule:#e6e4e1;--accent:#c63f1d;--accent-hover:#a3330f;--hover:#f5f4f3;--chip:#fbeee9;--box:#f0f0f0;--box-line:#d4d4d4;--ink:#23211f;--on-ink:#ece9e4;--on-ink-muted:#b8b3ac;--accent-on-ink:#ff8a66;--ok-bg:#e4f1e7;--ok-fg:#1f6a3a}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){--bg:#161514;--fg:#ece9e4;--muted:#a39e96;--rule:#33302d;--accent:#ff8a66;--accent-hover:#ffa585;--hover:#232120;--chip:#2c2320;--box:#2a2a2a;--box-line:#444444;--ink:#0d0c0b;--on-ink:#ece9e4;--on-ink-muted:#a39e96;--accent-on-ink:#ff8a66;--ok-bg:#1d3324;--ok-fg:#8fd3a5;color-scheme:dark}}
:root[data-theme="dark"]{--bg:#161514;--fg:#ece9e4;--muted:#a39e96;--rule:#33302d;--accent:#ff8a66;--accent-hover:#ffa585;--hover:#232120;--chip:#2c2320;--box:#2a2a2a;--box-line:#444444;--ink:#0d0c0b;--on-ink:#ece9e4;--on-ink-muted:#a39e96;--accent-on-ink:#ff8a66;--ok-bg:#1d3324;--ok-fg:#8fd3a5;color-scheme:dark}
body{margin:0;background:var(--bg);color:var(--fg)}
a{color:var(--accent);text-underline-offset:2px}a:hover{color:var(--accent-hover)}
a:focus-visible,button:focus-visible,input:focus-visible,textarea:focus-visible,summary:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
button{font:inherit;cursor:pointer}
NOTE: in dark mode the primary button (accent bg) needs dark text: use color:var(--bg) on primary buttons, not #fff.

Logo mark (inline SVG, 28px): <svg width="28" height="28" viewBox="0 0 28 28" aria-hidden="true"><rect x="2" y="2" width="24" height="24" rx="7" fill="var(--fg)"></rect><path d="M8 11h12M8 15h8M8 19h5" stroke="var(--accent)" stroke-width="2.2" stroke-linecap="round"></path></svg> + wordmark "Outside-In Brain" in Archivo 800 1.15rem.

Marketing nav (Home, HowItWorks, Pricing): logo left (links Home.dc.html); right: How it works (HowItWorks.dc.html) · Pricing (Pricing.dc.html) · Sample issue (Main.dc.html) · Sign in (SignIn.dc.html) · primary pill "Add to Chrome" (SignIn.dc.html). flex-wrap so it wraps on phones; links min-height 44px; current page link in accent with aria-current="page". Footer: mono muted line "Outside-In Brain · Company Brain Hackathon" + links How it works / Pricing / Sample issue.

## The .dc.html format (MUST follow; errors fail silently)
Skeleton:
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Short title</title>
<script src="./support.js"></script>
</head>
<body>
<x-dc>
<helmet>
<link …fonts…>
<style>…tokens…</style>
</helmet>
<div style="…root…"> … all UI markup … </div>
</x-dc>
<script type="text/x-dc" data-dc-script data-props='{"$preview":{"width":W,"height":H}}'>
class Component extends DCLogic {
  renderVals() {
    const s = this.state || {};
    return { … };
  }
}
</script>
</body>
</html>

Rules:
- Keep `<script src="./support.js"></script>` exactly. Close every non-void element; quote every attribute.
- Style with inline style="…" (using var(--token)) on elements. <helmet><style> holds only the token block / page basics above. You MAY add a few tiny helper rules there only for :hover states and <details>/<summary> marker hiding (details>summary{list-style:none} details>summary::-webkit-details-marker{display:none}), nothing else.
- PAGE layout is fluid: root has no px width; use max-width containers, %, rem, fr, flex-wrap. Must work at phone width (stack, wrap). Use flex/grid + gap.
- Holes: {{name}} is a dotted lookup into renderVals() only — never an expression ({{a+b}}, {{!x}}, {{f()}} all fail). Compute in renderVals and return by name. Interpolated attribute strings are fine: style="width: {{w}}". A whole-value attr like onClick="{{pick}}" passes a function.
- Events: onClick="{{handler}}" (camelCase) where handler is a function returned from renderVals; per-item handlers: map items in renderVals to include e.g. pick: () => this.setState({...}).
- Control flow: <sc-if value="{{cond}}" hint-placeholder-val="{{ false }}">…</sc-if> (there is no else: use a second sc-if with the opposite flag you compute). <sc-for list="{{items}}" as="item" hint-placeholder-count="3">…{{item.x}}…</sc-for>. Always set the hint-* attrs.
- Native <details><summary> works too (no JS needed) — preferred for fold-outs, matching Aaron's pages. An "Expand all" control would need state; if you want it, render each item's open state via state + sc-if instead of <details>.
- Links between pages: <a href="Dashboard.dc.html">…</a> — style the <a> itself as the button (no <button> inside <a>).
- Logic: classic JS, `class Component extends DCLogic`, no imports, no innerHTML/appendChild/DOM building. this.state may be undefined at first: `const s = this.state || {}`.
- data-props: single-quoted attribute, JSON; only "$preview" needed. Escape & as &amp; and ' as &#39; inside it.
- Accessibility: real <button>, <a href>, <input>/<textarea> with <label>; aria-label on icon-only buttons; decorative svg aria-hidden="true"; touch targets ≥44px; text contrast ≥4.5:1.
- No iframes, no external scripts, no network except the Google Fonts link, no emoji, no global key handlers.
- Copy that users would retype stays literal markup, not data, unless it is genuinely list data.

## Process rules for page writers
- Write ONLY your assigned file(s), with the Write tool, to the absolute path given. Write each file in one go (complete).
- Do NOT read files back, render, test, screenshot, install anything, or verify. Do not publish. Do not touch other files.
- Reply with one line per file: path written.
