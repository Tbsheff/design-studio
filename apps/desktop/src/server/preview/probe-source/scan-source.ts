import { SOURCE_LOC_ATTR } from "@design-studio/contracts";
import {
  APP_SOURCE_PATH,
  DEV_CHROME_SELECTOR,
} from "@design-studio/contracts/app";

const SCAN_SOURCE = String.raw`async (input) => {
  const LOC = ${JSON.stringify(SOURCE_LOC_ATTR)};
  const SKIP = new Set(['SCRIPT', 'STYLE', 'TEMPLATE', 'NOSCRIPT', 'LINK', 'META', 'BASE', 'TITLE', 'NEXTJS-PORTAL']);
  const CHROME = ${JSON.stringify(DEV_CHROME_SELECTOR)};
  const layer = (el) => !SKIP.has(el.tagName) && !(el.id || '').startsWith('studio-') && !el.matches(CHROME);
  const kids = (el) => el.tagName === 'svg' || el.tagName === 'SVG' ? [] : [...el.children].filter(layer);
  const fiberOf = (node) => { const key = Object.keys(node).find((k) => k.startsWith('__reactFiber$')); return key ? node[key] : null; };
  const stackOf = (f) => [f?._debugStack?.stack, f?.debugStack?.stack, f?.stack].find((v) => typeof v === 'string' && v.length > 0) || '';
  const nameOf = (owner) => { const type = owner?.type; return (typeof owner?.name === 'string' ? owner.name : type?.displayName || type?.render?.displayName || type?.render?.name || type?.type?.displayName || type?.type?.name || type?.name) || null; };
  const raw = new Map();
  const rawOf = (el) => {
    let found = raw.get(el);
    if (found) return found;
    const tagged = el.getAttribute(LOC);
    if (tagged) found = { tagged, own: '', owner: '', ownerRef: null, group: 't' + tagged };
    else {
      const fiber = fiberOf(el);
      const owner = fiber?._debugOwner || null;
      const own = stackOf(fiber);
      const ownerStack = stackOf(owner);
      found = { tagged: null, own, owner: ownerStack, ownerRef: owner, group: own || ownerStack ? own + '\u0001' + ownerStack : null };
    }
    raw.set(el, found);
    return found;
  };
  const nth = new Map();
  const counts = new Map();
  for (const el of document.body.querySelectorAll('*')) {
    const group = rawOf(el).group;
    if (!group) continue;
    const n = counts.get(group) || 0;
    counts.set(group, n + 1);
    nth.set(el, n);
  }
  const pathOf = (el) => {
    const parts = [];
    for (let node = el; node && node.parentElement && node !== document.body; node = node.parentElement) parts.unshift(node.tagName.toLowerCase() + ':nth-child(' + ([...node.parentElement.children].indexOf(node) + 1) + ')');
    return ['body', ...parts].join(' > ');
  };
  const sibOf = (el) => el.parentElement ? [...el.parentElement.children].filter((c) => c.tagName === el.tagName).indexOf(el) : 0;
  const textOf = (el) => {
    let own = '';
    for (const node of el.childNodes) if (node.nodeType === 3) own += node.textContent;
    if (!own.trim() && el.children.length === 0) own = el.textContent || el.getAttribute('aria-label') || el.getAttribute('alt') || el.getAttribute('placeholder') || '';
    own = own.replace(/\s+/g, ' ').trim();
    return own.length > 40 ? own.slice(0, 39) + '…' : own;
  };
  const picked = [];
  const index = new Map();
  const add = (el, depth) => {
    if (index.has(el)) return index.get(el);
    const parentEl = el.parentElement && el.parentElement !== document.documentElement ? el.parentElement : null;
    const parent = parentEl && parentEl !== document.body ? add(parentEl, -1) : -1;
    const at = picked.length;
    picked.push({ el, parent, depth });
    index.set(el, at);
    return at;
  };
  let rootEl = document.body;
  let truncated = false;
  let roots = null;
  if (input.paths) {
    roots = input.paths.map((p) => {
      let el = null;
      try { el = p ? document.querySelector(p) : null; } catch {}
      if (!el) return -1;
      const at = add(el, 0);
      picked[at].depth = 0;
      return at;
    });
  } else if (input.all) {
    for (const el of document.body.querySelectorAll('*')) if (layer(el)) add(el, 0);
  } else {
    if (input.root) {
      try { rootEl = document.querySelector(input.root); } catch { rootEl = null; }
      if (!rootEl) return { layers: [], truncated: false, missingRoot: true };
    }
    const stack = (rootEl === document.body ? kids(document.body).reverse() : [rootEl]).map((el) => ({ el, depth: 0 }));
    let shown = 0;
    while (stack.length > 0) {
      if (shown >= input.max) { truncated = true; break; }
      const { el, depth } = stack.pop();
      shown += 1;
      const at = add(el, depth);
      picked[at].depth = depth;
      if (depth >= input.depth) continue;
      const children = kids(el);
      for (let i = children.length - 1; i >= 0; i -= 1) stack.push({ el: children[i], depth: depth + 1 });
    }
  }
  const stacks = [];
  const seen = new Map();
  const want = (stack) => { if (stack && !seen.has(stack)) { seen.set(stack, stacks.length); stacks.push(stack); } };
  for (const p of picked) { const r = rawOf(p.el); if (!r.tagged) { want(r.own); want(r.owner); } }
  const sources = new Array(stacks.length).fill(null);
  const chunks = [];
  for (let i = 0; i < stacks.length; i += 20) chunks.push(i);
  await Promise.all(chunks.map(async (start) => {
    try {
      const res = await fetch(${JSON.stringify(APP_SOURCE_PATH)}, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ stacks: stacks.slice(start, start + 20) }), cache: 'no-store' });
      const body = res.ok ? await res.json() : null;
      (Array.isArray(body?.sources) ? body.sources : []).forEach((s, k) => { sources[start + k] = typeof s === 'string' ? s : null; });
    } catch {}
  }));
  const HOST = new Set([5, 26, 27]);
  const sameOwner = (a, b) => { if (a === b) return true; if (!a || !b || typeof a.tag === 'number' || typeof b.tag === 'number') return false; const upper = (info) => (info.owner ? nameOf(info.owner) : null); return nameOf(a) === nameOf(b) && a.key === b.key && a.env === b.env && upper(a) === upper(b); };
  const rootOf = (el, owner) => {
    for (let f = fiberOf(el)?.return; f; f = f.return) {
      if (f === owner || f === owner.alternate) return true;
      if (HOST.has(f.tag)) return false;
    }
    return false;
  };
  const srcOf = (stack) => stack && seen.has(stack) ? sources[seen.get(stack)] : null;
  const file = (value) => String(value).replace(/:\d+:\d+$/, '');
  const layers = picked.map(({ el, parent, depth }) => {
    const r = rawOf(el);
    const own = r.tagged || srcOf(r.own) || srcOf(r.owner);
    const usedRaw = r.tagged ? null : srcOf(r.owner);
    const used = own && usedRaw && file(own) !== file(usedRaw) ? usedRaw : null;
    let parentEl = el.parentElement;
    while (parentEl && parentEl !== document.body && !fiberOf(parentEl)) parentEl = parentEl.parentElement;
    const rootOfOwner = r.ownerRef && (typeof r.ownerRef.tag === 'number' ? rootOf(el, r.ownerRef) : !parentEl || parentEl === document.body || !sameOwner(fiberOf(parentEl)?._debugOwner || null, r.ownerRef));
    return { parent, depth, tag: el.tagName.toLowerCase(), path: pathOf(el), nth: nth.get(el) || 0, sib: sibOf(el), own: own || null, used, comp: rootOfOwner ? nameOf(r.ownerRef) : null, text: depth >= 0 ? textOf(el) : '', childCount: kids(el).length, hidden: el.getClientRects().length === 0 };
  });
  return { layers, truncated, missingRoot: false, roots };
}`;

export { SCAN_SOURCE };
