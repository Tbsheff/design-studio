import { APP_SOURCE_PATH } from '../../shared/app.js';
import { SOURCE_LOC_ATTR } from '../../shared/contracts.js';

export interface ProbeRule {
  id: string;
  kind: 'class' | 'font' | 'component';
  selector?: string;
  classes?: string[][];
  families?: string[];
  name?: string;
  tag?: string;
}

export interface RuleMiss {
  cls: string;
  prop: string | null;
  actual: string | null;
  expected: string | null;
}

export interface RuleHitElement {
  ruleId: string;
  selector: string;
  tag: string;
  text: string;
  loc: string | null;
  nearLoc: string | null;
  classes: string[];
  misses: RuleMiss[];
  family?: string;
}

export interface RulesProbeResult {
  hits: RuleHitElement[];
  scanned: Record<string, number>;
}

const RULES_PROBE = String.raw`async (input) => {
  const LOC = ${JSON.stringify(SOURCE_LOC_ATTR)};
  const SOURCE_PATH = ${JSON.stringify(APP_SOURCE_PATH)};
  const PER_RULE = 20;
  const PROPS = ['height', 'width', 'min-height', 'min-width', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left', 'margin-top', 'margin-right', 'margin-bottom', 'margin-left', 'row-gap', 'column-gap', 'border-top-left-radius', 'border-top-right-radius', 'border-bottom-right-radius', 'border-bottom-left-radius', 'border-top-width', 'font-size', 'font-weight', 'line-height', 'letter-spacing', 'color', 'background-color', 'border-top-color', 'box-shadow'];
  const LENGTH = /px$/;
  const nth = (el) => {
    const parent = el.parentElement;
    const tag = el.tagName.toLowerCase();
    if (!parent) return tag;
    const same = [...parent.children].filter((c) => c.tagName === el.tagName);
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
  const host = document.createElement('div');
  host.setAttribute('aria-hidden', 'true');
  host.style.cssText = 'position:absolute;left:-9999px;top:0;visibility:hidden;pointer-events:none;';
  document.body.appendChild(host);
  const sentinelCss = document.createElement('style');
  sentinelCss.textContent = '@layer base { :where([data-rules-sentinel]) { border-style: solid; border-width: 7px; border-color: rgb(1, 2, 3); border-radius: 7.7px; height: 7.7px; width: 7.7px; min-height: 7.7px; min-width: 7.7px; padding: 7.7px; margin: 7.7px; gap: 7.7px; font-size: 7.7px; font-weight: 100; line-height: 7.7px; letter-spacing: 0.7px; color: rgb(1, 2, 3); background-color: rgb(1, 2, 3); box-shadow: 1px 1px rgb(1, 2, 3); } }';
  host.appendChild(sentinelCss);
  const made = (cls, sentinel) => {
    const el = document.createElement('div');
    if (cls) el.className = cls;
    if (sentinel) el.setAttribute('data-rules-sentinel', '');
    el.style.position = 'absolute';
    el.style.boxSizing = 'content-box';
    host.appendChild(el);
    return getComputedStyle(el);
  };
  const values = (cs) => Object.fromEntries(PROPS.map((p) => [p, cs.getPropertyValue(p)]));
  const base = values(made('', false));
  const sentinelBase = values(made('', true));
  const refs = new Map();
  const measure = (cls) => {
    const plain = values(made(cls, false));
    const marked = values(made(cls, true));
    const changed = {};
    for (const p of PROPS) if (plain[p] !== base[p] || marked[p] !== sentinelBase[p]) changed[p] = plain[p];
    return Object.keys(changed).length > 0 ? changed : null;
  };
  const reference = (cls) => {
    if (!refs.has(cls)) refs.set(cls, cls.includes(':') ? null : measure(cls));
    return refs.get(cls);
  };
  const same = (a, b) => {
    if (a === b) return true;
    if (LENGTH.test(a) && LENGTH.test(b)) return Math.abs(parseFloat(a) - parseFloat(b)) < 0.6;
    return false;
  };
  const hasClass = (el, cls) => typeof el.className === 'string' && el.className.split(/\s+/).includes(cls);
  const checkAlt = (el, cs, cls) => {
    const ref = reference(cls);
    if (!ref) return hasClass(el, cls) ? null : [{ cls, prop: null, actual: null, expected: null }];
    const misses = [];
    for (const [prop, expected] of Object.entries(ref)) {
      const actual = cs.getPropertyValue(prop);
      if (!same(actual, expected)) misses.push({ cls, prop, actual, expected });
    }
    return misses.length ? misses : null;
  };
  const checkGroup = (el, cs, alts) => {
    let first = null;
    for (const cls of alts) {
      const misses = checkAlt(el, cs, cls);
      if (!misses) return null;
      if (!first) first = misses;
    }
    return first;
  };
  const shown = (el) => {
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none' && !el.closest('[aria-hidden="true"]');
  };
  const query = (selector) => {
    try { return [...document.body.querySelectorAll(selector)].filter((el) => !host.contains(el)); } catch { return []; }
  };
  const info = (el, ruleId, misses, extra) => {
    const near = el.closest('[' + LOC + ']');
    const text = (el.innerText || el.getAttribute('aria-label') || el.getAttribute('placeholder') || '').replace(/\s+/g, ' ').trim().slice(0, 50);
    return { ruleId, selector: selectorOf(el), tag: el.tagName.toLowerCase(), text, loc: el.getAttribute(LOC), nearLoc: near ? near.getAttribute(LOC) : null, classes: typeof el.className === 'string' ? el.className.split(/\s+/).filter(Boolean) : [], misses, ...extra };
  };
  const hits = [];
  const scanned = {};
  const out = new Map();
  const add = (rule, el, misses, extra) => {
    const list = out.get(rule.id) || [];
    if (list.length >= PER_RULE) return;
    list.push([el, misses, extra]);
    out.set(rule.id, list);
  };
  const classRule = (rule) => {
    const els = query(rule.selector).filter(shown).slice(0, 400);
    scanned[rule.id] = els.length;
    for (const el of els) {
      const cs = getComputedStyle(el);
      const misses = rule.classes.flatMap((alts) => checkGroup(el, cs, alts) || []);
      if (misses.length) add(rule, el, misses, {});
    }
  };
  const familyOf = (value) => {
    for (const part of value.split(',')) {
      const name = part.trim().replace(/^["']|["']$/g, '');
      if (!name || /fallback/i.test(name)) continue;
      return name.replace(/^_+/, '').replace(/_[0-9a-f]{4,}$/i, '').replace(/_/g, ' ').trim();
    }
    return '';
  };
  const textEls = () => [...document.body.querySelectorAll('*')].filter((el) => !host.contains(el) && !el.closest('svg, script, style, noscript') && [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())).slice(0, 3000);
  const fontRule = (rule) => {
    const allowed = new Set(rule.families.map((f) => f.toLowerCase()));
    const els = textEls().filter(shown);
    scanned[rule.id] = els.length;
    const seen = new Set();
    for (const el of els) {
      const family = familyOf(getComputedStyle(el).fontFamily);
      if (!family || allowed.has(family.toLowerCase()) || allowed.has(family.toLowerCase().replace(/ variable$/, ''))) continue;
      const key = family + '|' + (el.getAttribute(LOC) || el.parentElement?.className || '');
      if (seen.has(key)) continue;
      seen.add(key);
      add(rule, el, [{ cls: 'font-family', prop: 'font-family', actual: family, expected: rule.families.join(', ') }], { family });
    }
  };
  const componentEls = [];
  const componentRule = (rule) => {
    const els = query(rule.tag).filter((el) => shown(el) && !el.hasAttribute('data-slot'));
    scanned[rule.id] = els.length;
    for (const el of els.slice(0, 200)) componentEls.push([rule, el]);
  };
  for (const rule of input.rules) {
    if (rule.kind === 'class') classRule(rule);
    else if (rule.kind === 'font') fontRule(rule);
    else if (rule.kind === 'component') componentRule(rule);
  }
  const fiberOf = (el) => {
    for (const key of Object.keys(el)) if (key.startsWith('__reactFiber$')) return el[key];
    return null;
  };
  const stackOf = (fiber) => {
    if (!fiber) return '';
    const all = [fiber._debugStack && fiber._debugStack.stack, fiber.debugStack && fiber.debugStack.stack, fiber.stack];
    return all.find((s) => typeof s === 'string' && s.length > 0) || '';
  };
  const ownLocs = new Map();
  const resolve = async (els, ownOnly) => {
    const todo = [...new Set(els)].filter((el) => fiberOf(el) && (ownOnly || !el.hasAttribute(LOC)));
    const batch = async (group) => {
      const stacks = [];
      for (const el of group) {
        const fiber = fiberOf(el);
        stacks.push(stackOf(fiber), ownOnly ? '' : stackOf(fiber._debugOwner || null));
      }
      try {
        const res = await fetch(SOURCE_PATH, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ stacks }), cache: 'no-store' });
        if (!res.ok) return;
        const body = await res.json();
        const sources = Array.isArray(body.sources) ? body.sources : [];
        group.forEach((el, i) => {
          const own = sources[i * 2];
          const owner = sources[i * 2 + 1];
          const loc = typeof own === 'string' ? own : typeof owner === 'string' ? owner : null;
          if (ownOnly) ownLocs.set(el, loc);
          else if (loc) el.setAttribute(LOC, loc);
        });
      } catch {}
    };
    const groups = [];
    for (let at = 0; at < todo.length; at += 10) groups.push(todo.slice(at, at + 10));
    await Promise.all(groups.map(batch));
  };
  if (input.app) {
    await resolve(componentEls.map((pair) => pair[1]), true);
    await resolve([...out.values()].flatMap((list) => list.map((item) => item[0])), false);
  }
  const ownFile = (el) => {
    const loc = input.app ? ownLocs.get(el) || null : el.getAttribute(LOC);
    const m = loc ? /^(.+):\d+:\d+$/.exec(loc) : null;
    return m ? m[1] : null;
  };
  const kebab = (name) => name.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
  for (const [rule, el] of componentEls) {
    const file = ownFile(el);
    if (!file || file.includes('node_modules/')) continue;
    const base = file.split('/').pop().replace(/\.[jt]sx?$/, '').toLowerCase();
    if (base === rule.name.toLowerCase() || base === kebab(rule.name)) continue;
    add(rule, el, [{ cls: '<' + rule.tag + '>', prop: null, actual: file, expected: rule.name }], { loc: ownLocs.get(el) || el.getAttribute(LOC) });
  }
  for (const [ruleId, list] of out) for (const [el, misses, extra] of list) hits.push(info(el, ruleId, misses, extra));
  host.remove();
  return { hits, scanned };
}`;

export function rulesProbeExpression(input: { rules: ProbeRule[]; app: boolean }): string {
  return `(${RULES_PROBE})(${JSON.stringify(input)})`;
}
