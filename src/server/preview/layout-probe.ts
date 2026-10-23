import type { LayoutFinding } from '../../shared/contracts.js';

const MAX_LAYOUT_FINDINGS = 10;

export interface LayoutProbeResult {
  findings: LayoutFinding[];
  total: number;
}

const LAYOUT_PROBE_SOURCE = String.raw`(cap) => {
  const vw = window.innerWidth;
  const found = [];
  const reported = new Set();
  const SKIP = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEMPLATE', 'BR', 'WBR']);
  const ITEM_SELECTOR = 'a, button, li, th, td, label, input, select, [role="tab"], [role="menuitem"]';
  const clipsValue = (v) => v === 'hidden' || v === 'clip';
  const scrollsValue = (v) => v === 'auto' || v === 'scroll';
  const segment = (el) => {
    const tag = el.tagName.toLowerCase();
    if (el.id) return tag + '#' + CSS.escape(el.id);
    const cls = [...el.classList].filter((c) => !c.startsWith('data-')).slice(0, 2).map((c) => '.' + CSS.escape(c)).join('');
    const parent = el.parentElement;
    const same = parent ? [...parent.children].filter((c) => c.tagName === el.tagName) : [];
    const nth = same.length > 1 && !cls ? ':nth-of-type(' + (same.indexOf(el) + 1) + ')' : '';
    return tag + cls + nth;
  };
  const selectorOf = (el) => {
    const parts = [];
    let node = el;
    while (node && node !== document.body && parts.length < 3) {
      parts.unshift(segment(node));
      if (node.id) break;
      node = node.parentElement;
    }
    return parts.join(' > ') || el.tagName.toLowerCase();
  };
  const sourceOf = (el) => {
    const owner = el.closest('[data-studio-loc]');
    return owner ? owner.getAttribute('data-studio-loc') : null;
  };
  const shortText = (el) => (el.innerText || el.getAttribute('aria-label') || '').replace(/\s+/g, ' ').trim().slice(0, 40);
  const isShown = (el, rect, style) => {
    if (rect.width < 2 || rect.height < 2) return false;
    if (style.visibility === 'hidden' || style.display === 'none' || Number(style.opacity) === 0) return false;
    if (style.position === 'absolute' && style.clip !== 'auto' && style.clip !== '') return false;
    return !el.closest('[aria-hidden="true"]');
  };
  const isLineClamped = (style) => style.textOverflow === 'ellipsis' || (style.webkitLineClamp && style.webkitLineClamp !== 'none');
  const cutItems = (el, box) => {
    let items = [...el.querySelectorAll(ITEM_SELECTOR)];
    if (items.length === 0) items = [...el.children];
    const cut = items.filter((item) => {
      const r = item.getBoundingClientRect();
      return r.width > 0 && (r.right > box.right + 1 || r.left < box.left - 1 || r.bottom > box.bottom + 1);
    });
    return [...new Set(cut.map(shortText).filter(Boolean))].slice(0, 4);
  };
  const push = (el, finding) => {
    reported.add(el);
    found.push({ ...finding, selector: selectorOf(el), source: sourceOf(el), text: shortText(el) });
  };
  const hasReportedAncestor = (el) => {
    for (let node = el.parentElement; node; node = node.parentElement) if (reported.has(node)) return true;
    return false;
  };
  const inScroller = (el) => {
    for (let node = el.parentElement; node && node !== document.body; node = node.parentElement) {
      if (getComputedStyle(node).overflowX !== 'visible') return true;
    }
    return false;
  };
  const describeCut = (items) => (items.length ? '; cut: ' + items.map((t) => '"' + t + '"').join(', ') : '');
  const checkClip = (el, rect, style) => {
    const wide = el.scrollWidth - el.clientWidth;
    const tall = el.scrollHeight - el.clientHeight;
    const items = () => cutItems(el, rect);
    if (wide > 1 && clipsValue(style.overflowX) && !isLineClamped(style)) {
      const cut = items();
      push(el, { kind: 'clipped', severity: 'error', axis: 'x', scrollSize: el.scrollWidth, clientSize: el.clientWidth, cutItems: cut,
        detail: 'content is ' + el.scrollWidth + 'px wide in a ' + el.clientWidth + 'px box with overflow-x: ' + style.overflowX + describeCut(cut) });
      return;
    }
    if (wide > 1 && scrollsValue(style.overflowX)) {
      const cut = items();
      push(el, { kind: 'scrolls-sideways', severity: 'warning', axis: 'x', scrollSize: el.scrollWidth, clientSize: el.clientWidth, cutItems: cut,
        detail: 'content is ' + el.scrollWidth + 'px wide in a ' + el.clientWidth + 'px box; the user must scroll sideways to see ' + wide + 'px' + describeCut(cut) });
      return;
    }
    if (tall > 2 && clipsValue(style.overflowY) && !isLineClamped(style)) {
      const cut = items();
      push(el, { kind: 'clipped', severity: 'error', axis: 'y', scrollSize: el.scrollHeight, clientSize: el.clientHeight, cutItems: cut,
        detail: 'content is ' + el.scrollHeight + 'px tall in a ' + el.clientHeight + 'px box with overflow-y: ' + style.overflowY + describeCut(cut) });
    }
  };
  const checkViewport = (el, rect, style) => {
    if (style.position === 'fixed' || reported.has(el) || hasReportedAncestor(el) || inScroller(el)) return;
    if (rect.right <= vw + 1 && rect.left >= -1) return;
    if (rect.right <= 0 || rect.left >= vw) return;
    const parent = el.parentElement ? el.parentElement.getBoundingClientRect() : null;
    if (parent && (parent.right > vw + 1 || parent.left < -1) && el.parentElement !== document.body) return;
    push(el, { kind: 'past-viewport', severity: 'error', axis: 'x', scrollSize: Math.round(rect.right), clientSize: vw, cutItems: [],
      detail: 'element spans ' + Math.round(rect.left) + 'px to ' + Math.round(rect.right) + 'px in a ' + vw + 'px viewport' });
  };
  for (const el of document.body.querySelectorAll('*')) {
    if (SKIP.has(el.tagName) || (el.closest('svg') && el.tagName.toLowerCase() !== 'svg')) continue;
    const style = getComputedStyle(el);
    const rect = el.getBoundingClientRect();
    if (!isShown(el, rect, style)) continue;
    checkClip(el, rect, style);
    checkViewport(el, rect, style);
  }
  const rank = (f) => (f.severity === 'error' ? 0 : 1);
  const sorted = found.sort((a, b) => rank(a) - rank(b));
  return { findings: sorted.slice(0, cap), total: sorted.length };
}`;

export function layoutProbeExpression(cap = MAX_LAYOUT_FINDINGS): string {
  return `(${LAYOUT_PROBE_SOURCE})(${Number(cap)})`;
}
