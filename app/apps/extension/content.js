// Injected with chrome.scripting.executeScript({ files: ['content.js'] }) in the
// isolated world. The value of the last expression is the injection result, so
// the whole file is one IIFE returning the extracted page.
(() => {
  const MAX = 200000;
  const meta = (sel) => {
    const el = document.querySelector(sel);
    return el ? (el.getAttribute('content') || '').trim() : '';
  };
  const clean = (s) => (s || '').replace(/[ \t ]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();

  const isPdf = document.contentType === 'application/pdf' || /\.pdf($|[?#])/i.test(location.href);
  const selection = clean(String(window.getSelection ? window.getSelection() : ''));
  const title = clean(meta('meta[property="og:title"]') || document.title || location.href);
  const siteName = clean(meta('meta[property="og:site_name"]')) || location.hostname.replace(/^www\./, '');
  const ogType = meta('meta[property="og:type"]').toLowerCase();

  if (isPdf) {
    return { url: location.href, title, siteName, selection, text: '', isPdf: true, ogType };
  }

  // Light readability heuristic: score containers by the amount of paragraph
  // text they hold, penalising link-heavy blocks (menus, related lists).
  const JUNK = 'script,style,noscript,template,svg,canvas,iframe,nav,footer,aside,header,form,button,[role="navigation"],[role="banner"],[role="contentinfo"],[role="complementary"],[aria-hidden="true"],.sidebar,.comments,#comments,.related,.share,.newsletter,.ad,.ads,.advert';
  const BLOCKS = 'h1,h2,h3,h4,p,li,blockquote,pre,td,figcaption';

  const textLen = (el) => (el.textContent || '').replace(/\s+/g, ' ').trim().length;
  const linkLen = (el) => {
    let n = 0;
    el.querySelectorAll('a').forEach((a) => { n += textLen(a); });
    return n;
  };

  const score = (el) => {
    let s = 0;
    el.querySelectorAll('p').forEach((p) => {
      if (p.closest(JUNK)) return;
      const len = textLen(p);
      if (len > 40) s += len;
    });
    const total = textLen(el) || 1;
    const density = linkLen(el) / total;
    return s * (1 - Math.min(density, 0.9));
  };

  let best = null;
  let bestScore = 0;
  const preferred = document.querySelectorAll('article, main, [role="main"], [itemprop="articleBody"]');
  preferred.forEach((el) => {
    const sc = score(el) * 1.25;
    if (sc > bestScore) { best = el; bestScore = sc; }
  });
  document.querySelectorAll('div, section').forEach((el) => {
    // Only consider containers that directly hold several paragraphs.
    let direct = 0;
    for (const c of el.children) if (c.tagName === 'P') direct++;
    if (direct < 2) return;
    const sc = score(el);
    if (sc > bestScore) { best = el; bestScore = sc; }
  });
  const root = best || document.body;

  const extract = (container) => {
    if (!container) return '';
    const clone = container.cloneNode(true);
    clone.querySelectorAll(JUNK).forEach((n) => n.remove());
    const parts = [];
    clone.querySelectorAll(BLOCKS).forEach((el) => {
      const parent = el.parentElement && el.parentElement.closest(BLOCKS);
      if (parent && clone.contains(parent)) return; // avoid duplicates (p inside li)
      const t = (el.textContent || '').replace(/\s+/g, ' ').trim();
      if (t) parts.push(/^H\d$/.test(el.tagName) ? '\n' + t : t);
    });
    let out = parts.join('\n\n');
    if (out.length < 400) out = (clone.textContent || '').replace(/\s+\n/g, '\n').replace(/[ \t]+/g, ' ');
    return clean(out);
  };

  let text = extract(root);
  if (text.length < 300 && root !== document.body) text = extract(document.body);
  if (text.length > MAX) text = text.slice(0, MAX);

  return { url: location.href, title, siteName, selection: selection.slice(0, MAX), text, isPdf: false, ogType };
})();
