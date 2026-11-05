/* global chrome, oibGetConfig, oibGetMeBrains, oibCreateSave, oibDeleteSave, oibFlattenBrains, oibExtractTab,
   oibToSaveInput, oibDetectKind, oibKindLabel, oibWeekday, oibShortNext, oibRequestApiPermission, oibHasApiPermission */

const $ = (id) => document.getElementById(id);
const VIEWS = ['view-loading', 'view-connect', 'view-form', 'view-saved'];

const state = {
  cfg: null,
  tab: null,
  extractPromise: null,
  brains: [],
  selectedId: null,
  lastSave: null, // { id, brainId, organizationId }
  hasPermission: false,
};

function show(view) {
  for (const v of VIEWS) $(v).hidden = v !== view;
}

function setFooter(brain) {
  if (!brain) {
    $('footer').textContent = '';
    return;
  }
  const parts = [`${brain.pendingSaveCount ?? 0} saved since the last issue`];
  const next = oibShortNext(brain.nextIssueAt);
  if (next) parts.push(`next issue ${next}`);
  $('footer').textContent = parts.join(' · ');
}

function setFormMsg(text, isError) {
  const el = $('form-msg');
  el.textContent = text || 'Alt+Shift+S saves without opening this';
  el.classList.toggle('err', !!isError);
}

function showConnect(message) {
  if (message) $('connect-msg').textContent = message;
  show('view-connect');
  $('footer').textContent = '';
}

function renderChips() {
  const wrap = $('chips');
  wrap.textContent = '';
  const multiOrg = new Set(state.brains.map((b) => b.organizationId)).size > 1;
  for (const b of state.brains) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'chip';
    btn.setAttribute('aria-pressed', String(b.id === state.selectedId));
    btn.textContent = b.name;
    if (multiOrg) {
      const org = document.createElement('span');
      org.className = 'org';
      org.textContent = b.organizationName;
      btn.appendChild(org);
    }
    btn.addEventListener('click', () => {
      state.selectedId = b.id;
      chrome.storage.local.set({ lastBrainId: b.id });
      renderChips();
      setFooter(b);
    });
    wrap.appendChild(btn);
  }
  const add = document.createElement('a');
  add.className = 'chip new';
  add.href = `${state.cfg.webAppUrl}/dashboard`;
  add.target = '_blank';
  add.rel = 'noopener';
  add.textContent = '+ New brain';
  wrap.appendChild(add);
}

function renderPage(tab, extracted) {
  let domain = '';
  try {
    domain = new URL(tab.url).hostname.replace(/^www\./, '');
  } catch {
    domain = '';
  }
  $('page-domain').textContent = domain ? `This page · ${domain}` : 'This page';
  $('page-title').textContent = (extracted && extracted.title) || tab.title || tab.url || 'Untitled';
  const kind = (extracted && extracted.kind) || oibDetectKind(tab.url || '');
  $('page-kind').textContent = oibKindLabel(kind);
  $('tag-captions').hidden = !(extracted && extracted.hasCaptions);
  $('tag-selection').hidden = !(extracted && extracted.selection);
  $('tag-urlonly').hidden = !(extracted && !extracted.scriptable && kind !== 'PDF');
}

async function loadBrains() {
  try {
    const me = await oibGetMeBrains(state.cfg);
    state.brains = oibFlattenBrains(me);
    const ids = new Set(state.brains.map((b) => b.id));
    state.selectedId =
      (state.cfg.lastBrainId && ids.has(state.cfg.lastBrainId) && state.cfg.lastBrainId) ||
      (me.defaultBrainId && ids.has(me.defaultBrainId) && me.defaultBrainId) ||
      (state.brains[0] && state.brains[0].id) ||
      null;
    return true;
  } catch (e) {
    if (e.status === 401) {
      showConnect('Your extension key was not accepted. Create a new one on the website and paste it into Settings.');
    } else {
      showConnect(`${e.message || 'Could not load your brains.'} Check the API URL in Settings.`);
    }
    return false;
  }
}

async function handleSave() {
  // Request host access synchronously (keeps the user gesture). Not awaited:
  // the permission prompt can close the popup, and CORS covers us anyway.
  if (!state.hasPermission) oibRequestApiPermission(state.cfg.apiBaseUrl);

  const btn = $('save');
  btn.disabled = true;
  btn.textContent = 'Saving…';
  setFormMsg('Reading the page…');
  try {
    const extracted = await state.extractPromise;
    const note = $('note').value.trim();
    const input = oibToSaveInput(extracted, {});
    if (state.selectedId) input.brainId = state.selectedId;
    if (note) input.note = note;
    setFormMsg('Saving…');
    const saved = await oibCreateSave(state.cfg, input);
    const brain = state.brains.find((b) => b.id === saved.brainId) || state.brains.find((b) => b.id === state.selectedId);
    state.lastSave = { id: saved.id, brainId: saved.brainId, organizationId: brain ? brain.organizationId : null };
    await chrome.storage.local.set({ lastBrainId: saved.brainId });
    if (brain) brain.pendingSaveCount = (brain.pendingSaveCount || 0) + 1;

    $('saved-title').textContent = `Saved to ${brain ? brain.name : 'your brain'}`;
    const day = brain && oibWeekday(brain.nextIssueAt);
    $('saved-sub').textContent = day
      ? `It goes into ${day}’s issue with everything else you save this week.`
      : 'It goes into the next issue with everything else you save this week.';
    $('saved-msg').textContent = '';
    $('undo').disabled = false;
    setFooter(brain);
    show('view-saved');
  } catch (e) {
    if (e.status === 401) {
      showConnect('Your extension key was not accepted. Create a new one on the website and paste it into Settings.');
    } else {
      setFormMsg(e.message || 'Save failed. Try again.', true);
    }
  } finally {
    btn.disabled = false;
    btn.textContent = 'Save to brain';
  }
}

async function handleUndo() {
  const s = state.lastSave;
  if (!s) return;
  const btn = $('undo');
  btn.disabled = true;
  $('saved-msg').classList.remove('err');
  $('saved-msg').textContent = 'Removing…';
  try {
    if (!s.organizationId) throw new Error('Unknown workspace');
    await oibDeleteSave(state.cfg, s.organizationId, s.brainId, s.id);
    const brain = state.brains.find((b) => b.id === s.brainId);
    if (brain) brain.pendingSaveCount = Math.max(0, (brain.pendingSaveCount || 1) - 1);
    state.lastSave = null;
    setFooter(brain);
    setFormMsg('Removed. Nothing was saved.');
    show('view-form');
  } catch (e) {
    btn.disabled = false;
    $('saved-msg').classList.add('err');
    $('saved-msg').textContent = `Couldn’t undo (${e.message || 'error'}). Remove it from the dashboard.`;
  }
}

async function init() {
  state.cfg = await oibGetConfig();
  const web = state.cfg.webAppUrl;
  $('connect-web').href = `${web}/extension`;
  $('open-dashboard').href = `${web}/dashboard`;
  $('settings').addEventListener('click', () => chrome.runtime.openOptionsPage());
  $('connect-options').addEventListener('click', () => chrome.runtime.openOptionsPage());
  $('save').addEventListener('click', handleSave);
  $('undo').addEventListener('click', handleUndo);
  $('note').addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSave();
  });

  if (!state.cfg.apiKey) {
    showConnect();
    return;
  }

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  state.tab = tab;
  // Reading the page locally is fine on open (it powers the "Captions found"
  // chip); nothing is sent until the user clicks Save.
  state.extractPromise = oibExtractTab(tab);
  state.hasPermission = await oibHasApiPermission(state.cfg.apiBaseUrl);

  const ok = await loadBrains();
  if (!ok) return;

  renderPage(tab, null);
  renderChips();
  setFooter(state.brains.find((b) => b.id === state.selectedId));
  show('view-form');
  $('note').focus();

  state.extractPromise.then((ex) => renderPage(tab, ex));
}

init();
