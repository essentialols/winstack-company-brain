// Shared by popup.js (via <script>) and background.js (via importScripts).
/* global chrome */

const OIB_DEFAULTS = {
  apiBaseUrl: 'http://localhost:3001/api',
  webAppUrl: 'http://localhost:3000',
  apiKey: '',
};
const MAX_CHARS = 200000;

const oibTrimSlash = (s) => (s || '').trim().replace(/\/+$/, '');

async function oibGetConfig() {
  const stored = await chrome.storage.local.get(['apiBaseUrl', 'webAppUrl', 'apiKey', 'lastBrainId']);
  return {
    apiBaseUrl: oibTrimSlash(stored.apiBaseUrl || OIB_DEFAULTS.apiBaseUrl),
    webAppUrl: oibTrimSlash(stored.webAppUrl || OIB_DEFAULTS.webAppUrl),
    apiKey: (stored.apiKey || '').trim(),
    lastBrainId: stored.lastBrainId || null,
  };
}

/** Match pattern for the API host, used for the optional host permission. */
function oibOriginPattern(apiBaseUrl) {
  try {
    const u = new URL(apiBaseUrl);
    return `${u.protocol}//${u.hostname}/*`;
  } catch {
    return null;
  }
}

/**
 * Must be called synchronously inside a click handler (no await before it),
 * otherwise Chrome drops the user gesture. Resolves true when already granted.
 * Never rejects. The API also allows chrome-extension:// origins via CORS, so
 * a denied permission does not block saving.
 */
function oibRequestApiPermission(apiBaseUrl) {
  const pattern = oibOriginPattern(apiBaseUrl);
  if (!pattern || !chrome.permissions) return Promise.resolve(false);
  try {
    return chrome.permissions.request({ origins: [pattern] }).catch(() => false);
  } catch {
    return Promise.resolve(false);
  }
}

async function oibHasApiPermission(apiBaseUrl) {
  const pattern = oibOriginPattern(apiBaseUrl);
  if (!pattern || !chrome.permissions) return false;
  try {
    return await chrome.permissions.contains({ origins: [pattern] });
  } catch {
    return false;
  }
}

class OibApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

async function oibApi(cfg, path, { method = 'GET', body } = {}) {
  if (!cfg.apiKey) throw new OibApiError(401, 'Not connected');
  let res;
  try {
    res = await fetch(cfg.apiBaseUrl + path, {
      method,
      headers: {
        Authorization: `Bearer ${cfg.apiKey}`,
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new OibApiError(0, `Can't reach ${cfg.apiBaseUrl}`);
  }
  if (res.status === 204) return null;
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const msg = data && (Array.isArray(data.message) ? data.message.join(', ') : data.message);
    throw new OibApiError(res.status, msg || `Request failed (${res.status})`);
  }
  return data;
}

const oibGetMeBrains = (cfg) => oibApi(cfg, '/me/brains');
const oibCreateSave = (cfg, input) => oibApi(cfg, '/saves', { method: 'POST', body: input });
const oibDeleteSave = (cfg, orgId, brainId, saveId) =>
  oibApi(cfg, `/organizations/${orgId}/brains/${brainId}/saves/${saveId}`, { method: 'DELETE' });

function oibFlattenBrains(me) {
  const out = [];
  for (const org of (me && me.organizations) || []) {
    for (const b of org.brains || []) out.push({ ...b, organizationId: org.id, organizationName: org.name });
  }
  return out;
}

function oibIsPdfUrl(url) {
  return /\.pdf($|[?#])/i.test(url || '');
}

function oibIsYouTubeWatch(url) {
  try {
    const u = new URL(url);
    return /(^|\.)youtube\.com$/.test(u.hostname) && u.pathname === '/watch';
  } catch {
    return false;
  }
}

/** Kind detection from the URL (plus og:type when we have it). */
function oibDetectKind(url, ogType) {
  let host = '';
  let path = '';
  try {
    const u = new URL(url);
    host = u.hostname.replace(/^www\./, '');
    path = u.pathname;
  } catch {
    return 'OTHER';
  }
  if (oibIsPdfUrl(url)) return 'PDF';
  if (/(^|\.)youtube\.com$/.test(host) && (path === '/watch' || path.startsWith('/shorts/'))) return 'VIDEO';
  if (host === 'youtu.be' || host === 'vimeo.com' || host === 'loom.com' || host.endsWith('.loom.com')) return 'VIDEO';
  if (host === 'open.spotify.com' && /^\/(episode|show)\//.test(path)) return 'PODCAST';
  if (host === 'podcasts.apple.com' || host === 'overcast.fm' || host === 'pca.st') return 'PODCAST';
  if (/^(x|twitter)\.com$/.test(host) && /\/status\//.test(path)) return 'POST';
  if (host === 'linkedin.com' && /^\/(posts|feed\/update)\//.test(path)) return 'POST';
  if (host === 'bsky.app' || host === 'threads.net' || host === 'news.ycombinator.com' || host === 'reddit.com' || host.endsWith('.reddit.com')) return 'POST';
  if (/\.(png|jpe?g|gif|webp|avif)($|[?#])/i.test(path)) return 'IMAGE';
  if (ogType && ogType.startsWith('video')) return 'VIDEO';
  return 'ARTICLE';
}

const oibKindLabel = (k) =>
  ({ ARTICLE: 'Article', VIDEO: 'Video', PODCAST: 'Podcast', PDF: 'PDF', POST: 'Post', SNIPPET: 'Snippet', TEXT: 'Text', IMAGE: 'Image', OTHER: 'Page' })[k] || 'Page';

/**
 * Runs in the page's MAIN world so it can read YouTube's own player response.
 * Must stay self-contained (it is serialised by executeScript).
 */
async function oibYouTubeCaptionsInPage() {
  try {
    let pr = null;
    const player = document.getElementById('movie_player');
    // After SPA navigation ytInitialPlayerResponse can be stale; the player's own
    // response is current, so prefer it.
    if (player && typeof player.getPlayerResponse === 'function') pr = player.getPlayerResponse();
    const vid = new URL(location.href).searchParams.get('v');
    if (!pr || (pr.videoDetails && vid && pr.videoDetails.videoId !== vid)) pr = window.ytInitialPlayerResponse || pr;
    const tracks =
      (pr && pr.captions && pr.captions.playerCaptionsTracklistRenderer && pr.captions.playerCaptionsTracklistRenderer.captionTracks) || [];
    if (!tracks.length) return { captions: '', title: (pr && pr.videoDetails && pr.videoDetails.title) || '' };
    const isEn = (t) => /^en/i.test(t.languageCode || '');
    const isAsr = (t) => t.kind === 'asr';
    const track =
      tracks.find((t) => isEn(t) && !isAsr(t)) ||
      tracks.find((t) => isEn(t)) ||
      tracks.find((t) => !isAsr(t)) ||
      tracks[0];
    const res = await fetch(track.baseUrl + '&fmt=json3', { credentials: 'include' });
    if (!res.ok) return { captions: '', title: pr.videoDetails ? pr.videoDetails.title : '' };
    const json = await res.json();
    const lines = [];
    for (const ev of json.events || []) {
      if (!ev.segs) continue;
      const line = ev.segs.map((s) => s.utf8 || '').join('').replace(/\s+/g, ' ').trim();
      if (line) lines.push(line);
    }
    return {
      captions: lines.join(' ').slice(0, 200000),
      title: (pr.videoDetails && pr.videoDetails.title) || '',
      author: (pr.videoDetails && pr.videoDetails.author) || '',
    };
  } catch (e) {
    return { captions: '', error: String(e) };
  }
}

/**
 * Extracts the tab into a CreateSaveInput (minus brainId/note).
 * Never throws: falls back to URL + title when the page can't be scripted
 * (chrome:// pages, Web Store, built-in PDF viewer).
 */
async function oibExtractTab(tab) {
  const url = tab.url || '';
  const base = { url, title: tab.title || url, kind: oibDetectKind(url) };
  if (!/^https?:/i.test(url)) return { ...base, kind: 'OTHER', hasCaptions: false, scriptable: false };
  if (oibIsPdfUrl(url)) return { ...base, kind: 'PDF', hasCaptions: false, scriptable: false };

  let page = null;
  try {
    const [r] = await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['content.js'] });
    page = r && r.result;
  } catch {
    page = null;
  }
  if (!page) return { ...base, hasCaptions: false, scriptable: false };
  if (page.isPdf) return { url, title: page.title || base.title, kind: 'PDF', hasCaptions: false, scriptable: true };

  const input = {
    url: page.url || url,
    title: (page.title || base.title).slice(0, 500),
    siteName: page.siteName || undefined,
    kind: oibDetectKind(page.url || url, page.ogType),
    text: page.text ? page.text.slice(0, MAX_CHARS) : undefined,
    selection: page.selection || undefined,
  };

  let hasCaptions = false;
  if (oibIsYouTubeWatch(input.url)) {
    try {
      const [r] = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        world: 'MAIN',
        func: oibYouTubeCaptionsInPage,
      });
      const yt = r && r.result;
      if (yt && yt.title) input.title = yt.title;
      if (yt && yt.captions) {
        input.captions = yt.captions;
        hasCaptions = true;
      }
    } catch {
      /* no captions; still save the page */
    }
    input.kind = 'VIDEO';
  }
  return { ...input, hasCaptions, scriptable: true };
}

/** Strips helper fields so only CreateSaveInput keys reach the API. */
function oibToSaveInput(extracted, extra) {
  const out = {};
  for (const k of ['url', 'title', 'siteName', 'kind', 'text', 'selection', 'captions']) {
    if (extracted[k]) out[k] = extracted[k];
  }
  return { ...out, ...extra };
}

/** "Saturday" from an ISO date, or null. */
function oibWeekday(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d)) return null;
  return d.toLocaleDateString(undefined, { weekday: 'long' });
}

function oibShortNext(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d)) return null;
  const day = d.toLocaleDateString(undefined, { weekday: 'short' });
  const time = d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  return `${day} ${time}`;
}
