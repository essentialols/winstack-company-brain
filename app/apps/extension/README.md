# Outside-In Brain — Chrome extension

Manifest V3, plain JS. No build step.

## Load it

1. Open `chrome://extensions` and turn on **Developer mode**.
2. Click **Load unpacked** and pick this folder (`apps/extension`).
3. The settings page opens. On the web app, go to `/extension`, click **Create extension key**, and paste the key and API URL into settings. Click **Save**, then **Test connection**.
4. Pin the extension. Click it on any page, pick a brain, and click **Save to brain**.

## Ways to save

- Popup: pick a brain, add a note, save. Undo removes the save.
- Right-click a page, a selection or a link: **Save to Outside-In Brain**.
- `Alt+Shift+S`: saves the current tab to the last-used brain. The icon shows a check mark for 2 seconds (or `!` on error). Change the shortcut at `chrome://extensions/shortcuts`.

Saving happens only on click. Opening the popup reads the page locally to show its kind; nothing is sent until you save.

## What gets sent

`POST {API}/saves` with `Authorization: Bearer oib_…`: url, title, `og:site_name`, selection, main text (light readability pass, max 200k chars), YouTube captions (from the player's caption tracks, `fmt=json3`), and kind. PDFs send the URL only.

## Settings

| Field | Default |
| --- | --- |
| API base URL | `http://localhost:3001/api` |
| Web app URL | `http://localhost:3000` |
| Extension key | — |

Settings live in `chrome.storage.local`. On save, the extension asks for host access to the API origin. This is optional: the API also allows `chrome-extension://` origins via CORS.

## Package

`pnpm --filter @app-starter/extension zip` writes `apps/extension.zip`.
