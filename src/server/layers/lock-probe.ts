import { APP_SOURCE_PATH } from '../../shared/app.js';
import { SOURCE_LOC_ATTR } from '../../shared/contracts.js';
import { probeOnPage } from '../preview/probe-page.js';
import type { PreviewService } from '../types.js';

export interface LockProbe {
  found: boolean;
  key: string;
  tag: string;
  own: string[];
  inside: boolean;
  page: string;
  resolved: Record<string, boolean>;
}

const VIEWPORT = { width: 1440, height: 900 };

const PROBE = String.raw`async (input) => {
  const LOC = ${JSON.stringify(SOURCE_LOC_ATTR)};
  const next = Boolean(document.querySelector('script[data-studio-app="next"]'));
  const pathOf = (element) => {
    const parts = [];
    for (let node = element; node && node.parentElement && node !== document.body; node = node.parentElement) parts.unshift(node.tagName.toLowerCase() + ':nth-child(' + ([...node.parentElement.children].indexOf(node) + 1) + ')');
    return ['body', ...parts].join(' > ');
  };
  const fiberOf = (node) => { const key = Object.keys(node).find((k) => k.startsWith('__reactFiber$')); return key ? node[key] : null; };
  const stackOf = (f) => [f?._debugStack?.stack, f?.debugStack?.stack, f?.stack].find((v) => typeof v === 'string' && v.length > 0) || '';
  const fileOf = (value) => String(value).replace(/:\d+:\d+$/, '');
  const sources = new Map();
  if (next) {
    const raw = [];
    for (const element of document.body.querySelectorAll('*')) {
      const fiber = fiberOf(element);
      if (!fiber || (fiber.tag !== undefined && fiber.tag !== 5)) continue;
      const stacks = [stackOf(fiber), stackOf(fiber._debugOwner || null)];
      if (stacks.some((stack) => stack !== '')) raw.push([element, stacks]);
    }
    const unique = [...new Set(raw.flatMap(([, stacks]) => stacks.filter((stack) => stack !== '')))];
    const found = new Map();
    const chunks = [];
    for (let start = 0; start < unique.length; start += 20) chunks.push(unique.slice(start, start + 20));
    await Promise.all(chunks.map(async (chunk) => {
      try {
        const res = await fetch(${JSON.stringify(APP_SOURCE_PATH)}, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ stacks: chunk }), cache: 'no-store' });
        const body = res.ok ? await res.json() : null;
        chunk.forEach((stack, index) => found.set(stack, (Array.isArray(body?.sources) ? body.sources[index] : null) || null));
      } catch {}
    }));
    for (const [element, [ownStack, ownerStack]] of raw) {
      const own = found.get(ownStack) || null;
      const owner = found.get(ownerStack) || null;
      const loc = own || owner;
      if (loc) sources.set(element, { own: loc, used: own && owner && fileOf(own) !== fileOf(owner) ? owner : null });
    }
  }
  const sourceOf = (element) => next ? sources.get(element) || null : (element.getAttribute(LOC) ? { own: element.getAttribute(LOC), used: null } : null);
  const sameSource = (own, used) => next
    ? [...sources].filter(([, source]) => source.own === own && source.used === used).map(([element]) => element)
    : [...document.querySelectorAll('[' + LOC + '="' + CSS.escape(own) + '"]')];
  const keyOf = (element) => {
    const source = sourceOf(element);
    if (!source) return location.pathname + '|sel:' + pathOf(element);
    const index = Math.max(0, sameSource(source.own, source.used).indexOf(element));
    return location.pathname + '|' + (source.used ? 'use:' + source.used + '|' : '') + 'loc:' + source.own + '#' + index;
  };
  const resolve = (raw) => {
    const at = raw.indexOf('|');
    const page = at < 0 ? '' : raw.slice(0, at);
    const key = at < 0 ? raw : raw.slice(at + 1);
    if (page !== location.pathname) return null;
    try {
      if (key.startsWith('sel:')) return document.querySelector(key.slice(4));
      const match = /^(?:use:([^|]*)\|)?loc:(.*)#(\d+)$/.exec(key);
      if (!match) return null;
      return sameSource(match[2] || '', match[1] || null)[Number(match[3])] || null;
    } catch { return null; }
  };
  const resolved = {};
  const lockedEls = [];
  for (const key of input.keys) {
    const element = resolve(key);
    resolved[key] = Boolean(element);
    if (element) lockedEls.push([key, element]);
  }
  let element = null;
  try { element = input.selector ? document.querySelector(input.selector) : null; } catch { element = null; }
  if (!element) return { found: false, key: '', tag: '', own: [], inside: false, page: location.pathname, resolved };
  const own = lockedEls.filter(([, locked]) => locked === element).map(([key]) => key);
  const inside = lockedEls.some(([, locked]) => locked !== element && locked.contains(element));
  return { found: true, key: keyOf(element), tag: element.tagName.toLowerCase(), own, inside, page: location.pathname, resolved };
}`;

export function probeLock(preview: PreviewService, url: string, selector: string | null, keys: string[]): Promise<LockProbe> {
  return probeOnPage<LockProbe>(preview, url, VIEWPORT, `(${PROBE})(${JSON.stringify({ selector, keys })})`);
}

export function lockDelta(probe: LockProbe, locked: boolean): { add: string[]; remove: string[] } {
  if (locked) return { add: probe.own.length > 0 ? [] : [probe.key], remove: [] };
  return { add: [], remove: [...new Set([probe.key, ...probe.own])] };
}

export function applyDelta(keys: string[], delta: { add: string[]; remove: string[] }): string[] {
  const remove = new Set(delta.remove);
  return [...keys.filter((key) => !remove.has(key)), ...delta.add];
}

export function lockOutcome(probe: LockProbe, locked: boolean, count: number): string {
  const what = `${probe.tag} on ${probe.page}`;
  if (locked) return `${probe.own.length > 0 ? 'Already locked' : 'Locked'}: ${what}. A click on the canvas now passes through it and its children. ${count} locked layer${count === 1 ? '' : 's'} in this direction.`;
  const note = probe.inside ? ' A parent layer is still locked, so clicks still pass through it.' : '';
  return `${probe.own.length > 0 ? 'Unlocked' : 'Was not locked'}: ${what}.${note} ${count} locked layer${count === 1 ? '' : 's'} in this direction.`;
}

function lockLabel(what: string): string {
  if (what.startsWith('sel:')) return what.slice(4);
  const use = /^use:([^|]*)\|loc:(.*)$/.exec(what);
  return use ? `${use[1]} (component part ${use[2]})` : what.replace(/^loc:/, '');
}

export function describeLocks(keys: string[], resolved: Record<string, boolean> | null, page: string | null): string {
  if (keys.length === 0) return 'No layer is locked in this direction.';
  const lines = keys.map((key) => {
    const at = key.indexOf('|');
    const where = at < 0 ? '' : key.slice(0, at);
    const what = at < 0 ? key : key.slice(at + 1);
    const state = resolved && where === page ? (resolved[key] ? '' : ' (not found on the page now)') : '';
    return `- ${where || '/'} ${lockLabel(what)}${state}`;
  });
  return `${keys.length} locked layer${keys.length === 1 ? '' : 's'} (a click on the canvas passes through a locked layer and its children):\n${lines.join('\n')}`;
}
