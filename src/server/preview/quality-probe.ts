import type { NavSummary } from '../../shared/contracts.js';

const PLACEHOLDER_PATTERN = String.raw`\b(lorem|ipsum|todo|tbd|to come|will be added|placeholder|sample (data|timings))\b|example\.(com|org)|@[\w.-]+\.example\b`;

export interface ProbeRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface TapHit {
  selector: string;
  source: string | null;
  text: string;
  width: number;
  height: number;
}

export interface PlaceholderHit {
  selector: string;
  source: string | null;
  text: string;
  match: string;
  optedOut: boolean;
}

export interface GenericHit {
  pattern: 'plan-cards' | 'hero-feature-cards' | 'all-centered';
  detail: string;
  selector: string | null;
  source: string | null;
}

export interface DuplicateHit {
  kind: 'price' | 'cta';
  text: string;
  count: number;
  selectors: string[];
  sources: (string | null)[];
}

interface QualityProbeOptions {
  tapTargets: boolean;
  placeholder: boolean;
  layout?: boolean;
  duplicates?: boolean;
  selectionLocs: string[];
  cap: number;
}

export interface QualityProbeResult {
  tap: TapHit[];
  tapTotal: number;
  placeholder: PlaceholderHit[];
  placeholderTotal: number;
  generic?: GenericHit[];
  duplicates?: DuplicateHit[];
  nav: NavSummary;
  selectionRects: ProbeRect[];
  pageHeight: number;
}

const QUALITY_PROBE_SOURCE = String.raw`(opts) => {
  const vw = window.innerWidth;
  const INTERACTIVE = 'a[href], button, input:not([type="hidden"]), select, textarea, summary, [role="button"], [role="link"], [role="tab"], [role="checkbox"], [role="switch"], [role="menuitem"]';
  const segment = (el) => {
    const tag = el.tagName.toLowerCase();
    if (el.id) return tag + '#' + CSS.escape(el.id);
    const cls = [...el.classList].slice(0, 2).map((c) => '.' + CSS.escape(c)).join('');
    return tag + cls;
  };
  const selectorOf = (el) => {
    const parts = [];
    for (let node = el; node && node !== document.body && parts.length < 3; node = node.parentElement) {
      parts.unshift(segment(node));
      if (node.id) break;
    }
    return parts.join(' > ') || el.tagName.toLowerCase();
  };
  const sourceOf = (el) => {
    const owner = el.closest('[data-studio-loc]');
    return owner ? owner.getAttribute('data-studio-loc') : null;
  };
  const textOf = (el) => (el.innerText || el.getAttribute('aria-label') || el.getAttribute('value') || '').replace(/\s+/g, ' ').trim().slice(0, 40);
  const shown = (el) => {
    const rect = el.getBoundingClientRect();
    if (rect.width < 1 || rect.height < 1) return false;
    const style = getComputedStyle(el);
    if (style.visibility === 'hidden' || style.display === 'none' || Number(style.opacity) === 0) return false;
    if (el.closest('[aria-hidden="true"], [hidden], [inert]')) return false;
    return rect.right > 0 && rect.left < vw;
  };
  const px = (value) => (value && value.endsWith('px') ? parseFloat(value) : null);
  const pseudoBox = (el, rect, which) => {
    const style = getComputedStyle(el, which);
    if (!style || style.content === 'none' || style.content === 'normal' || style.position !== 'absolute') return null;
    const top = px(style.top), left = px(style.left), right = px(style.right), bottom = px(style.bottom);
    const width = px(style.width), height = px(style.height);
    const w = left !== null && right !== null ? rect.width - left - right : width;
    const h = top !== null && bottom !== null ? rect.height - top - bottom : height;
    return w !== null && h !== null ? { width: w, height: h } : null;
  };
  const targetSize = (el) => {
    const rect = el.getBoundingClientRect();
    let width = rect.width, height = rect.height;
    for (const which of ['::after', '::before']) {
      const box = pseudoBox(el, rect, which);
      if (box) { width = Math.max(width, box.width); height = Math.max(height, box.height); }
    }
    return { width: Math.round(width), height: Math.round(height) };
  };
  const isInlineTextLink = (el) => {
    if (el.tagName !== 'A' || getComputedStyle(el).display !== 'inline') return false;
    const block = el.parentElement;
    if (!block) return false;
    const own = (el.innerText || '').length;
    return (block.innerText || '').length > own + 12;
  };
  const tapTargetOf = (el) => {
    if (el.tagName === 'INPUT' && (el.type === 'checkbox' || el.type === 'radio')) return el.closest('label') || el;
    return el;
  };
  const collectTap = () => {
    const hits = [];
    const seen = new Set();
    for (const raw of document.querySelectorAll(INTERACTIVE)) {
      const el = tapTargetOf(raw);
      if (seen.has(el) || !shown(el) || isInlineTextLink(el)) continue;
      seen.add(el);
      const size = targetSize(el);
      if (size.width >= 44 && size.height >= 44) continue;
      hits.push({ selector: selectorOf(el), source: sourceOf(el), text: textOf(el), width: size.width, height: size.height });
    }
    hits.sort((a, b) => Math.min(a.width, a.height) - Math.min(b.width, b.height));
    return hits;
  };
  const collectPlaceholder = () => {
    const pattern = new RegExp(opts.pattern, 'i');
    const hits = [];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const parent = node.parentElement;
      if (!parent || parent.closest('script, style, noscript, template')) continue;
      const match = pattern.exec(node.textContent || '');
      if (!match || !shown(parent)) continue;
      hits.push({ selector: selectorOf(parent), source: sourceOf(parent), text: (node.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 80), match: match[0], optedOut: !!parent.closest('[data-sample]') });
    }
    return hits;
  };
  const navRoots = () => {
    const navs = [...document.querySelectorAll('nav, [role="navigation"]')];
    if (navs.length) return navs;
    return [...document.querySelectorAll('header')].filter((h) => h.querySelectorAll('a[href]').length >= 2);
  };
  const MENU_NAME = /menu|navigation|nav\b/i;
  const isMenuControl = (el) => {
    if (!shown(el)) return false;
    if (el.hasAttribute('aria-expanded') || el.hasAttribute('aria-controls')) return true;
    return MENU_NAME.test((el.getAttribute('aria-label') || '') + ' ' + (el.innerText || ''));
  };
  const collectNav = () => {
    const roots = navRoots();
    const links = roots.flatMap((root) => [...root.querySelectorAll('a[href], button')]);
    const visible = links.filter((link) => {
      if (!shown(link)) return false;
      const r = link.getBoundingClientRect();
      return r.left >= -1 && r.right <= vw + 1;
    });
    const controls = [...document.querySelectorAll('button, summary, [role="button"]')].filter(isMenuControl);
    return { navs: roots.length, totalLinks: links.length, visibleLinks: visible.length, menuControl: controls.length > 0 };
  };
  const selectionRects = () => opts.selectionLocs.flatMap((loc) => {
    const el = document.querySelector('[data-studio-loc="' + CSS.escape(loc) + '"]');
    if (!el) return [];
    const r = el.getBoundingClientRect();
    return [{ x: r.left + window.scrollX, y: r.top + window.scrollY, width: r.width, height: r.height }];
  });
  const PRICE = /[$€£]\s?\d|\/\s?mo\b|per month|\/\s?month/i;
  const visibleKids = (el) => [...el.children].filter((child) => shown(child) && child.getBoundingClientRect().width > 120);
  const equalRow = (kids) => {
    if (kids.length !== 3) return false;
    const rects = kids.map((kid) => kid.getBoundingClientRect());
    const widths = rects.map((r) => r.width);
    const tops = rects.map((r) => r.top);
    return Math.max(...widths) - Math.min(...widths) <= Math.max(...widths) * 0.12 && Math.max(...tops) - Math.min(...tops) <= 48 && Math.min(...widths) >= 180;
  };
  const differs = (kids) => {
    const st = kids.map((kid) => getComputedStyle(kid));
    const rects = kids.map((kid) => kid.getBoundingClientRect());
    const filled = st[1].backgroundColor !== st[0].backgroundColor && st[0].backgroundColor === st[2].backgroundColor;
    const raised = rects[1].height > Math.max(rects[0].height, rects[2].height) + 8 || rects[1].top < Math.min(rects[0].top, rects[2].top) - 4 || st[1].transform !== 'none' || (st[1].boxShadow !== st[0].boxShadow && st[0].boxShadow === st[2].boxShadow);
    return filled || raised;
  };
  const below = (el, selector) => [...document.querySelectorAll(selector)].some((other) => shown(other) && other.getBoundingClientRect().top > el.getBoundingClientRect().bottom);
  const hasFaqBelow = (el) => below(el, 'details') || [...document.querySelectorAll('h2, h3')].some((h) => /faq|questions/i.test(h.innerText || '') && h.getBoundingClientRect().top > el.getBoundingClientRect().bottom);
  const rows = () => [...document.body.querySelectorAll('*')].filter((el) => !['SCRIPT', 'STYLE', 'svg'].includes(el.tagName)).map((el) => [el, visibleKids(el)]).filter(([, kids]) => equalRow(kids));
  const planCards = (row) => {
    const [el, kids] = row;
    if (kids.filter((kid) => PRICE.test(kid.innerText || '')).length < 2 || !differs(kids)) return null;
    const top = el.getBoundingClientRect().top;
    if ([...document.querySelectorAll('table, [role="table"], [role="grid"]')].some((t) => shown(t) && t.getBoundingClientRect().bottom <= top)) return null;
    const table = below(el, 'table, [role="table"], [role="grid"]');
    const faq = hasFaqBelow(el);
    const tail = (table ? ', then a comparison table' : '') + (faq ? ', then an FAQ' : '');
    return { pattern: 'plan-cards', detail: 'three equal plan cards in one row with the middle one filled or raised' + tail, selector: selectorOf(el), source: sourceOf(el) };
  };
  const featureCards = (row, h1) => {
    const [el, kids] = row;
    if (!h1 || kids.some((kid) => PRICE.test(kid.innerText || ''))) return null;
    if (!kids.every((kid) => kid.querySelector('h2, h3, h4') && (kid.innerText || '').length > 20)) return null;
    const gap = el.getBoundingClientRect().top - h1.getBoundingClientRect().bottom;
    return gap >= 0 && gap < 900 ? { pattern: 'hero-feature-cards', detail: 'a hero followed by three equal feature cards', selector: selectorOf(el), source: sourceOf(el) } : null;
  };
  const centered = () => {
    const heads = [...document.querySelectorAll('h1, h2')].filter(shown);
    if (heads.length < 4) return null;
    const isCentered = (h) => {
      const r = h.getBoundingClientRect();
      return getComputedStyle(h).textAlign === 'center' || (Math.abs(r.left + r.width / 2 - vw / 2) < 4 && r.width < vw * 0.7);
    };
    const count = heads.filter(isCentered).length;
    return count / heads.length >= 0.8 ? { pattern: 'all-centered', detail: count + ' of ' + heads.length + ' section headings are centered', selector: null, source: null } : null;
  };
  const collectGeneric = () => {
    const h1 = [...document.querySelectorAll('h1')].find(shown) || null;
    const found = rows();
    const hits = [];
    const plan = found.map(planCards).find(Boolean);
    if (plan) hits.push(plan);
    else {
      const feature = found.map((row) => featureCards(row, h1)).find(Boolean);
      if (feature) hits.push(feature);
    }
    const center = centered();
    if (center) hits.push(center);
    return hits;
  };
  const AMOUNT = /[$€£]\s?\d[\d,]*(?:\.\d+)?/g;
  const PERIOD = /\/\s?(mo|month|yr|year|user|seat)\b|per (month|year|user|seat)|a (month|year)|\b(monthly|yearly|annually)\b|billed (monthly|yearly|annually)/i;
  const periodKey = (text) => {
    const m = PERIOD.exec(text);
    if (!m) return '';
    const word = m[0].toLowerCase();
    if (/mo|month/.test(word)) return '/mo';
    if (/yr|year|annual/.test(word)) return '/yr';
    return '/' + (/seat/.test(word) ? 'seat' : 'user');
  };
  const clips = (style) => /hidden|clip/.test(style.overflowX + style.overflowY) || (style.clip && style.clip !== 'auto') || style.clipPath !== 'none';
  const clippedAway = (el, r) => {
    let depth = 0;
    for (let node = el.parentElement; node && node !== document.body && depth < 14; node = node.parentElement, depth += 1) {
      if (!clips(getComputedStyle(node))) continue;
      const box = node.getBoundingClientRect();
      if (box.width < 2 || box.height < 2) return true;
      if (r.right <= box.left || r.left >= box.right || r.bottom <= box.top || r.top >= box.bottom) return true;
    }
    return false;
  };
  const reallyShown = (el) => {
    if (!shown(el) || el.closest('[data-studio-repeat]')) return false;
    const r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2 || clippedAway(el, r)) return false;
    const closed = el.closest('details:not([open])');
    return !closed || !!el.closest('summary');
  };
  const contextOf = (el) => {
    let node = el.parentElement;
    for (let depth = 0; node && node !== document.body && depth < 6; depth += 1, node = node.parentElement) {
      const lines = (node.innerText || '').split('\n').map((line) => line.trim()).filter(Boolean);
      if (lines.length >= 2 && lines[0].length < 40) return lines[0];
    }
    return '';
  };
  const addHit = (map, key, kind, text, el) => {
    const entry = map.get(key) || { kind, text, els: [] };
    if (!entry.els.some((other) => other.contains(el) || el.contains(other))) entry.els.push(el);
    map.set(key, entry);
  };
  const collectPrices = (map) => {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const parent = node.parentElement;
      if (!parent || parent.closest('script, style, noscript, template') || !reallyShown(parent)) continue;
      const amounts = (node.textContent || '').match(AMOUNT);
      if (!amounts) continue;
      const scope = (parent.parentElement && (parent.parentElement.innerText || '').length < 80 ? parent.parentElement : parent);
      const period = periodKey(scope.innerText || '');
      for (const amount of amounts) {
        const value = amount.replace(/\s/g, '');
        addHit(map, 'price:' + value + period, 'price', value + period, scope);
      }
    }
  };
  const actionOf = (el) => {
    const href = el.tagName === 'A' ? (el.getAttribute('href') || '') : '';
    if (href && href !== '#' && !href.startsWith('javascript:')) return href;
    return el.getAttribute('data-plan') || el.getAttribute('value') || el.getAttribute('formaction') || contextOf(el);
  };
  const collectCtas = (map) => {
    for (const el of document.querySelectorAll('a[href], button, [role="button"]')) {
      if (el.closest('nav, header, footer, summary, [role="tablist"], [role="radiogroup"]') || !reallyShown(el)) continue;
      const name = (el.getAttribute('aria-label') || el.innerText || '').replace(/\s+/g, ' ').trim();
      if (!name || name.length > 40) continue;
      addHit(map, 'cta:' + name.toLowerCase() + '|' + actionOf(el), 'cta', name, el);
    }
  };
  const collectDuplicates = () => {
    const map = new Map();
    collectPrices(map);
    collectCtas(map);
    return [...map.values()].filter((entry) => entry.els.length > 1).map((entry) => ({
      kind: entry.kind, text: entry.text, count: entry.els.length,
      selectors: entry.els.slice(0, 4).map(selectorOf), sources: entry.els.slice(0, 4).map(sourceOf),
    }));
  };
  const tap = opts.tapTargets ? collectTap() : [];
  const placeholder = opts.placeholder ? collectPlaceholder() : [];
  return {
    tap: tap.slice(0, opts.cap), tapTotal: tap.length,
    placeholder: placeholder.slice(0, opts.cap), placeholderTotal: placeholder.length,
    generic: opts.layout ? collectGeneric() : [],
    duplicates: opts.duplicates ? collectDuplicates() : [],
    nav: collectNav(), selectionRects: selectionRects(),
    pageHeight: Math.max(document.documentElement.scrollHeight, document.body ? document.body.scrollHeight : 0),
  };
}`;

export function qualityProbeExpression(options: QualityProbeOptions): string {
  return `(${QUALITY_PROBE_SOURCE})(${JSON.stringify({ ...options, pattern: PLACEHOLDER_PATTERN })})`;
}
