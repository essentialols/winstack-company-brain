/* global chrome, importScripts, oibGetConfig, oibApi, oibGetMeBrains, oibCreateSave, oibExtractTab, oibToSaveInput, oibDetectKind */
importScripts('lib.js');

const MENU_PAGE = 'oib-save-page';
const MENU_SELECTION = 'oib-save-selection';
const MENU_LINK = 'oib-save-link';

chrome.runtime.onInstalled.addListener((details) => {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({ id: MENU_PAGE, title: 'Save to Outside-In Brain', contexts: ['page'] });
    chrome.contextMenus.create({ id: MENU_SELECTION, title: 'Save selection to Outside-In Brain', contexts: ['selection'] });
    chrome.contextMenus.create({ id: MENU_LINK, title: 'Save link to Outside-In Brain', contexts: ['link'] });
  });
  if (details.reason === 'install') chrome.runtime.openOptionsPage();
});

async function flashBadge(tabId, ok, message) {
  const opts = tabId ? { tabId } : {};
  try {
    await chrome.action.setBadgeBackgroundColor({ ...opts, color: ok ? '#1f6a3a' : '#c63f1d' });
    await chrome.action.setBadgeText({ ...opts, text: ok ? '✓' : '!' });
    if (!ok && message) await chrome.action.setTitle({ ...opts, title: `Outside-In Brain: ${message}` });
  } catch {
    /* tab may be gone */
  }
  setTimeout(() => {
    chrome.action.setBadgeText({ ...opts, text: '' }).catch(() => {});
    if (!ok) chrome.action.setTitle({ ...opts, title: 'Save to Outside-In Brain' }).catch(() => {});
  }, ok ? 2000 : 4000);
}

/** Last-used brain, else the server's default; omitted brainId → server default too. */
async function resolveBrainId(cfg) {
  if (cfg.lastBrainId) return cfg.lastBrainId;
  try {
    const me = await oibGetMeBrains(cfg);
    if (me && me.defaultBrainId) {
      await chrome.storage.local.set({ lastBrainId: me.defaultBrainId });
      return me.defaultBrainId;
    }
  } catch {
    /* fall through */
  }
  return undefined;
}

async function quickSave(tab, buildInput) {
  const cfg = await oibGetConfig();
  if (!cfg.apiKey) {
    await flashBadge(tab && tab.id, false, 'connect your account in Options');
    chrome.runtime.openOptionsPage();
    return;
  }
  try {
    const input = await buildInput();
    const brainId = await resolveBrainId(cfg);
    if (brainId) input.brainId = brainId;
    try {
      await oibCreateSave(cfg, input);
    } catch (e) {
      // A remembered brain may have been deleted or the user may have left the org.
      if (brainId && (e.status === 403 || e.status === 404)) {
        delete input.brainId;
        await chrome.storage.local.remove('lastBrainId');
        await oibCreateSave(cfg, input);
      } else {
        throw e;
      }
    }
    await flashBadge(tab && tab.id, true);
  } catch (e) {
    await flashBadge(tab && tab.id, false, e.message || 'save failed');
  }
}

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === MENU_LINK && info.linkUrl) {
    quickSave(tab, async () => ({
      url: info.linkUrl,
      title: info.linkUrl,
      kind: oibDetectKind(info.linkUrl),
    }));
    return;
  }
  if (info.menuItemId === MENU_SELECTION) {
    quickSave(tab, async () => {
      const ex = await oibExtractTab(tab);
      // The menu's selectionText is always available, even where we can't script.
      const selection = ex.selection || info.selectionText || '';
      return oibToSaveInput(ex, { selection, kind: ex.kind === 'VIDEO' || ex.kind === 'PDF' ? ex.kind : 'SNIPPET' });
    });
    return;
  }
  if (info.menuItemId === MENU_PAGE) {
    quickSave(tab, async () => oibToSaveInput(await oibExtractTab(tab), {}));
  }
});

chrome.commands.onCommand.addListener(async (command, tab) => {
  if (command !== 'save-page') return;
  const target = tab || (await chrome.tabs.query({ active: true, currentWindow: true }))[0];
  if (!target) return;
  quickSave(target, async () => oibToSaveInput(await oibExtractTab(target), {}));
});
