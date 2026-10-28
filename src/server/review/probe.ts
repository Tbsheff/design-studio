import { SOURCE_LOC_ATTR } from '../../shared/contracts.js';
import { APP_SOURCE_PATH } from '../../shared/app.js';

export interface ProbeElement {
  selector: string;
  tag: string;
  text: string;
  loc: string | null;
  nearLoc: string | null;
  classes: string[];
  display: string;
  width: number;
  height: number;
  padding: [number, number, number, number];
  tapStyle?: Record<string, string> | null;
}

export interface TokenHit {
  via: 'class' | 'inline' | 'rule';
  selector: string;
  prop: string;
  value: string;
  cls?: string;
  variants?: string;
  rule?: string;
}

export interface ProbeResult {
  elements: Record<string, ProbeElement | null>;
  tokens: TokenHit[];
  tokenElements: Record<string, ProbeElement>;
  taps: ProbeElement[];
}

export interface ProbeInput {
  selectors: string[];
  app: boolean;
  scanRules: boolean;
  cap: number;
}

const PROBE_SOURCE = String.raw`async (input) => {
  const LOC = ${JSON.stringify(SOURCE_LOC_ATTR)};
  const SOURCE_PATH = ${JSON.stringify(APP_SOURCE_PATH)};
  const COLOR_PROPS = new Set(['color', 'background-color', 'background', 'border-color']);
  const LENGTH_PROPS = new Set(['font-size', 'gap', 'row-gap', 'column-gap', 'border-radius', 'padding', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left', 'margin', 'margin-top', 'margin-right', 'margin-bottom', 'margin-left']);
  const COLOR_LITERAL = /#[0-9a-fA-F]{3,8}\b|(?:rgba?|hsla?|oklch|oklab|lab|lch)\([^)]*\)/;
  const LENGTH_LITERAL = /(?<![\w.-])-?\d*\.?[1-9]\d*(?:px|rem)\b/;
  const ARBITRARY = /^((?:[a-z0-9-]+:)*)(-?[a-z][a-z0-9-]*?)-\[([^\]]+)\]$/;
  const nth = (el) => {
    const parent = el.parentElement;
    if (!parent) return el.tagName.toLowerCase();
    const same = [...parent.children].filter((c) => c.tagName === el.tagName);
    const tag = el.tagName.toLowerCase();
    return same.length > 1 ? tag + ':nth-of-type(' + (same.indexOf(el) + 1) + ')' : tag;
  };
  const selectorOf = (el) => {
    const parts = [];
    let node = el;
    while (node && node !== document.body && node !== document.documentElement) {
      if (node.id && document.querySelectorAll('#' + CSS.escape(node.id)).length === 1) {
        parts.unshift('#' + CSS.escape(node.id));
        return parts.join(' > ');
      }
      parts.unshift(nth(node));
      node = node.parentElement;
    }
    parts.unshift('body');
    return parts.join(' > ');
  };
  const px = (v) => Math.round(parseFloat(v) || 0);
  const info = (el, selector) => {
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    const near = el.closest('[' + LOC + ']');
    const text = (el.innerText || el.getAttribute('aria-label') || el.getAttribute('alt') || el.getAttribute('title') || '').replace(/\s+/g, ' ').trim().slice(0, 60);
    return {
      selector,
      tag: el.tagName.toLowerCase(),
      text,
      loc: el.getAttribute(LOC),
      nearLoc: near ? near.getAttribute(LOC) : null,
      classes: typeof el.className === 'string' ? el.className.split(/\s+/).filter(Boolean) : [],
      display: cs.display,
      width: Math.round(r.width),
      height: Math.round(r.height),
      padding: [px(cs.paddingTop), px(cs.paddingRight), px(cs.paddingBottom), px(cs.paddingLeft)],
    };
  };
  const fiberOf = (el) => {
    for (const key of Object.keys(el)) if (key.startsWith('__reactFiber$')) return el[key];
    return null;
  };
  const stackOf = (fiber) => {
    if (!fiber) return '';
    const all = [fiber._debugStack && fiber._debugStack.stack, fiber.debugStack && fiber.debugStack.stack, fiber.stack];
    return all.find((s) => typeof s === 'string' && s.length > 0) || '';
  };
  const resolveApp = async (els) => {
    const todo = els.filter((el) => !el.hasAttribute(LOC) && fiberOf(el));
    if (todo.length === 0) return;
    const stacks = [];
    for (const el of todo) {
      const fiber = fiberOf(el);
      stacks.push(stackOf(fiber), stackOf(fiber._debugOwner || null));
    }
    try {
      const res = await fetch(SOURCE_PATH, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ stacks }), cache: 'no-store' });
      if (!res.ok) return;
      const body = await res.json();
      const sources = Array.isArray(body.sources) ? body.sources : [];
      todo.forEach((el, i) => {
        const own = sources[i * 2];
        const owner = sources[i * 2 + 1];
        const loc = typeof own === 'string' ? own : typeof owner === 'string' ? owner : null;
        if (loc) el.setAttribute(LOC, loc);
      });
    } catch {}
  };
  const find = (selector) => {
    try { return document.querySelector(selector); } catch { return null; }
  };
  const hits = [];
  const hitEls = new Map();
  const seen = new Set();
  const push = (el, hit) => {
    if (hits.length >= input.cap) return;
    const selector = hitEls.get(el) || selectorOf(el);
    const key = selector + '|' + hit.prop + '|' + hit.value + '|' + (hit.cls || hit.rule || '');
    if (seen.has(key)) return;
    seen.add(key);
    hitEls.set(el, selector);
    hits.push({ ...hit, selector });
  };
  const rawIn = (prop, value) => {
    if (value.includes('var(')) return null;
    if (COLOR_PROPS.has(prop)) return (COLOR_LITERAL.exec(value) || [null])[0];
    if (LENGTH_PROPS.has(prop)) return (LENGTH_LITERAL.exec(value) || [null])[0];
    return null;
  };
  const scanClasses = (el) => {
    if (typeof el.className !== 'string') return;
    for (const cls of el.className.split(/\s+/)) {
      const m = ARBITRARY.exec(cls);
      if (!m || m[3].includes('var(') || m[3].startsWith('--')) continue;
      push(el, { via: 'class', prop: m[2], value: m[3].replace(/_/g, ' '), cls, variants: m[1] });
    }
  };
  const scanInline = (el) => {
    const style = el.getAttribute('style');
    if (!style) return;
    for (const decl of style.split(';')) {
      const at = decl.indexOf(':');
      if (at < 0) continue;
      const prop = decl.slice(0, at).trim().toLowerCase();
      const value = decl.slice(at + 1).trim();
      const raw = rawIn(prop, value);
      if (raw) push(el, { via: 'inline', prop, value: raw });
    }
  };
  const skipSheet = (sheet) => {
    const owner = sheet.ownerNode;
    const id = (sheet.href || '') + ' ' + (owner && owner.getAttribute ? owner.getAttribute('data-vite-dev-id') || '' : '');
    if (/design-system|node_modules/.test(id)) return true;
    const text = owner && owner.textContent ? owner.textContent.slice(0, 400) : '';
    return /tailwindcss/.test(text);
  };
  const scanRule = (rule) => {
    if (rule.cssRules && !(rule instanceof CSSStyleRule)) {
      for (const inner of rule.cssRules) scanRule(inner);
      return;
    }
    if (!(rule instanceof CSSStyleRule) || /:root|\[data-theme|^\.dark/.test(rule.selectorText)) return;
    const el = find(rule.selectorText);
    if (!el) return;
    for (const prop of rule.style) {
      const family = prop.replace(/^border-(top|bottom)-(left|right)-radius$/, 'border-radius').replace(/^(row|column)-gap$/, 'gap').replace(/^(padding|margin)-(top|right|bottom|left)$/, '$1');
      const raw = rawIn(family, rule.style.getPropertyValue(prop));
      if (raw) push(el, { via: 'rule', prop: family, value: raw, rule: rule.selectorText.slice(0, 120) });
    }
  };
  const all = [...document.body.querySelectorAll('*')].filter((el) => !el.closest('svg') || el.tagName.toLowerCase() === 'svg').slice(0, 4000);
  for (const el of all) {
    scanClasses(el);
    scanInline(el);
  }
  if (input.scanRules) {
    for (const sheet of document.styleSheets) {
      if (skipSheet(sheet)) continue;
      let rules = [];
      try { rules = [...sheet.cssRules]; } catch { continue; }
      for (const rule of rules) scanRule(rule);
    }
  }
  const TAP = 'a[href], button, input:not([type="hidden"]), select, textarea, summary, [role="button"], [role="link"], [role="checkbox"], [role="switch"], [role="tab"], [role="menuitem"]';
  const inSentence = (el) => {
    if (getComputedStyle(el).display !== 'inline' || !el.parentElement) return false;
    const own = (el.textContent || '').trim().length;
    return (el.parentElement.textContent || '').trim().length > own + 1;
  };
  const shown = (el, r) => {
    const cs = getComputedStyle(el);
    return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && Number(cs.opacity) !== 0 && !el.closest('[aria-hidden="true"]');
  };
  const smallTaps = [];
  for (const el of document.body.querySelectorAll(TAP)) {
    if (smallTaps.length >= 20) break;
    const r = el.getBoundingClientRect();
    if (!shown(el, r) || (r.width >= 24 && r.height >= 24) || inSentence(el) || (el.parentElement && el.parentElement.closest(TAP))) continue;
    smallTaps.push(el);
  }
  const targets = input.selectors.map((s) => [s, find(s)]);
  if (input.app) await resolveApp([...targets.map((t) => t[1]).filter(Boolean), ...hitEls.keys(), ...smallTaps]);
  const elements = {};
  for (const [s, el] of targets) elements[s] = el ? info(el, s) : null;
  const tokenElements = {};
  for (const [el, selector] of hitEls) tokenElements[selector] = info(el, selector);
  const grow = (n) => {
    if (n >= 24) return 0;
    const half = Math.ceil((24 - n) / 2);
    return half + (half % 2);
  };
  const fits = (el, style) => {
    const saved = el.getAttribute('style');
    for (const [key, value] of Object.entries(style)) el.style.setProperty(key, value);
    const r = el.getBoundingClientRect();
    if (saved === null) el.removeAttribute('style');
    else el.setAttribute('style', saved);
    return r.width >= 24 && r.height >= 24;
  };
  const tapStyle = (el) => {
    const cs = getComputedStyle(el);
    if (cs.display === 'inline' || cs.display === 'contents') return null;
    const r = el.getBoundingClientRect();
    const v = grow(r.height);
    const h = grow(r.width);
    const pad = {};
    if (v > 0) Object.assign(pad, { 'padding-top': px(cs.paddingTop) + v + 'px', 'padding-bottom': px(cs.paddingBottom) + v + 'px' });
    if (h > 0) Object.assign(pad, { 'padding-left': px(cs.paddingLeft) + h + 'px', 'padding-right': px(cs.paddingRight) + h + 'px' });
    if (fits(el, pad)) return pad;
    const size = {};
    if (r.width < 24) size.width = '24px';
    if (r.height < 24) size.height = '24px';
    return fits(el, size) ? size : null;
  };
  const taps = smallTaps.map((el) => ({ ...info(el, selectorOf(el)), tapStyle: tapStyle(el) }));
  return { elements, tokens: hits, tokenElements, taps };
}`;

export function reviewProbeExpression(input: ProbeInput): string {
  return `(${PROBE_SOURCE})(${JSON.stringify(input)})`;
}
