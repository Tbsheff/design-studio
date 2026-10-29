import { LINK_TEXT_MAX } from '../../shared/links.js';

const CLICK_MAX = 30;

export function clickProbeScript(skip: readonly string[]): string {
  return `(async (skip) => {
  const nav = window.navigation;
  if (!nav || !document.body) return [];
  let hit = null;
  const onNav = (e) => { if (!hit) hit = e.destination.url; if (e.cancelable) e.preventDefault(); };
  nav.addEventListener('navigate', onNav);
  const open = window.open;
  window.open = (u) => { if (!hit && u) hit = new URL(String(u), location.href).href; return null; };
  window.alert = () => undefined; window.confirm = () => false; window.prompt = () => null;
  const css = (v) => v.replace(/\\\\/g, '\\\\\\\\').replace(/"/g, '\\\\"');
  const goodId = (el) => el.id && /^[A-Za-z_][\\w-]*$/.test(el.id) && document.querySelectorAll('#' + el.id).length === 1;
  const step = (el) => {
    const tag = el.tagName.toLowerCase();
    const same = el.parentElement ? Array.from(el.parentElement.children).filter((c) => c.tagName === el.tagName) : [el];
    return same.length > 1 ? tag + ':nth-of-type(' + (same.indexOf(el) + 1) + ')' : tag;
  };
  const selectorOf = (el) => {
    if (goodId(el)) return '#' + el.id;
    const parts = [];
    for (let node = el; node && node !== document.body && parts.length < 6; node = node.parentElement) {
      if (node !== el && goodId(node)) { parts.unshift('#' + node.id); return parts.join(' > '); }
      parts.unshift(step(node));
    }
    return parts.join(' > ');
  };
  const realHref = (el) => { const h = (el.getAttribute('href') || '').trim(); return h !== '' && !h.startsWith('#') && !/^javascript:/i.test(h); };
  const relPath = (from, to) => {
    const a = from.split('/').slice(0, -1);
    const b = to.split('/');
    let i = 0;
    while (i < a.length && i < b.length - 1 && a[i] === b[i]) i += 1;
    return '../'.repeat(a.length - i) + b.slice(i).join('/');
  };
  const rel = (url) => {
    const u = new URL(url, location.href);
    if (u.origin !== location.origin) return null;
    for (const key of Array.from(u.searchParams.keys())) if (key.startsWith('__studio')) u.searchParams.delete(key);
    const q = u.searchParams.toString();
    return relPath(location.pathname, u.pathname) + (q ? '?' + q : '');
  };
  const pick = 'button, [onclick], [role="button"], a, input[type="submit"], input[type="image"], input[type="button"]';
  const known = new Set();
  for (const sel of skip) { try { document.querySelectorAll(sel).forEach((el) => known.add(el)); } catch {} }
  const cands = Array.from(document.querySelectorAll(pick)).filter((el) => !known.has(el) && !(el.tagName === 'A' && realHref(el))).slice(0, ${CLICK_MAX});
  const out = [];
  for (const el of cands) {
    if (!el.isConnected) continue;
    hit = null;
    const form = el.form || null;
    const quiet = form ? form.noValidate : false;
    if (form) form.noValidate = true;
    try { el.click(); } catch {}
    await new Promise((r) => setTimeout(r, 40));
    if (form) form.noValidate = quiet;
    const href = hit ? rel(hit) : null;
    const text = (el.tagName === 'INPUT' ? el.value || '' : el.innerText || el.textContent || '').replace(/\\s+/g, ' ').trim().slice(0, ${LINK_TEXT_MAX});
    if (href) out.push({ href, selector: selectorOf(el), tag: el.tagName.toLowerCase(), text });
  }
  nav.removeEventListener('navigate', onNav);
  window.open = open;
  return out.map((a) => ({ href: a.href, selector: a.selector, tag: a.tag, ...(a.text ? { label: a.text } : {}) }));
})(${JSON.stringify(skip.slice(0, 120))})`;
}
