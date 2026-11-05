/* global chrome, OIB_DEFAULTS, oibTrimSlash, oibGetConfig, oibGetMeBrains, oibFlattenBrains, oibRequestApiPermission */

const $ = (id) => document.getElementById(id);

function readForm() {
  return {
    apiKey: $('apiKey').value.trim(),
    apiBaseUrl: oibTrimSlash($('apiBaseUrl').value) || OIB_DEFAULTS.apiBaseUrl,
    webAppUrl: oibTrimSlash($('webAppUrl').value) || OIB_DEFAULTS.webAppUrl,
  };
}

function setStatus(text, ok) {
  const el = $('status');
  el.textContent = text;
  el.classList.toggle('ok', ok === true);
  el.classList.toggle('err', ok === false);
}

function validate(cfg) {
  try {
    new URL(cfg.apiBaseUrl);
    new URL(cfg.webAppUrl);
  } catch {
    return 'Enter full URLs, including http:// or https://.';
  }
  if (cfg.apiKey && !cfg.apiKey.startsWith('oib_')) return 'Extension keys start with oib_.';
  return null;
}

async function persist(cfg) {
  const prev = await oibGetConfig();
  const changes = { ...cfg };
  await chrome.storage.local.set(changes);
  // A different key may belong to another user; forget the remembered brain.
  if (prev.apiKey !== cfg.apiKey) await chrome.storage.local.remove('lastBrainId');
  $('web-link').href = `${cfg.webAppUrl}/extension`;
}

async function test(cfg) {
  if (!cfg.apiKey) {
    setStatus('Paste your extension key first.', false);
    return;
  }
  setStatus('Testing…');
  try {
    const me = await oibGetMeBrains(cfg);
    const brains = oibFlattenBrains(me);
    const who = (me.user && (me.user.name || me.user.email)) || 'you';
    setStatus(`Connected as ${who} · ${brains.length} brain${brains.length === 1 ? '' : 's'}`, true);
  } catch (e) {
    setStatus(e.status === 401 ? 'The key was not accepted. Create a new one on the website.' : e.message || 'Connection failed.', false);
  }
}

$('form').addEventListener('submit', (e) => {
  e.preventDefault();
  const cfg = readForm();
  const err = validate(cfg);
  if (err) {
    setStatus(err, false);
    return;
  }
  // Called before any await so Chrome still sees the user gesture.
  const perm = oibRequestApiPermission(cfg.apiBaseUrl);
  perm.then(() => persist(cfg)).then(() => test(cfg));
});

$('test').addEventListener('click', () => {
  const cfg = readForm();
  const err = validate(cfg);
  if (err) {
    setStatus(err, false);
    return;
  }
  oibRequestApiPermission(cfg.apiBaseUrl).then(() => test(cfg));
});

(async () => {
  const cfg = await oibGetConfig();
  $('apiKey').value = cfg.apiKey;
  $('apiBaseUrl').value = cfg.apiBaseUrl;
  $('webAppUrl').value = cfg.webAppUrl;
  $('web-link').href = `${cfg.webAppUrl}/extension`;
})();
