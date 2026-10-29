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

const PROBE = String.raw`(input) => {
  const LOC = ${JSON.stringify(SOURCE_LOC_ATTR)};
  const next = Boolean(document.querySelector('script[data-studio-app="next"]'));
  const pathOf = (element) => {
    const parts = [];
    for (let node = element; node && node.parentElement && node !== document.body; node = node.parentElement) parts.unshift(node.tagName.toLowerCase() + ':nth-child(' + ([...node.parentElement.children].indexOf(node) + 1) + ')');
    return ['body', ...parts].join(' > ');
  };
  const keyOf = (element) => {
    const loc = next ? null : element.getAttribute(LOC);
    if (!loc) return location.pathname + '|sel:' + pathOf(element);
    const same = [...document.querySelectorAll('[' + LOC + '="' + CSS.escape(loc) + '"]')];
    return location.pathname + '|loc:' + loc + '#' + Math.max(0, same.indexOf(element));
  };
  const resolve = (raw) => {
    const at = raw.indexOf('|');
    const page = at < 0 ? '' : raw.slice(0, at);
    const key = at < 0 ? raw : raw.slice(at + 1);
    if (page !== location.pathname) return null;
    try {
      if (key.startsWith('sel:')) return document.querySelector(key.slice(4));
      const match = /^loc:(.*)#(\d+)$/.exec(key);
      if (!match) return null;
      return document.querySelectorAll('[' + LOC + '="' + CSS.escape(match[1] || '') + '"]')[Number(match[2])] || null;
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

export function describeLocks(keys: string[], resolved: Record<string, boolean> | null, page: string | null): string {
  if (keys.length === 0) return 'No layer is locked in this direction.';
  const lines = keys.map((key) => {
    const at = key.indexOf('|');
    const where = at < 0 ? '' : key.slice(0, at);
    const what = at < 0 ? key : key.slice(at + 1);
    const state = resolved && where === page ? (resolved[key] ? '' : ' (not found on the page now)') : '';
    return `- ${where || '/'} ${what.startsWith('sel:') ? what.slice(4) : what.replace(/^loc:/, '')}${state}`;
  });
  return `${keys.length} locked layer${keys.length === 1 ? '' : 's'} (a click on the canvas passes through a locked layer and its children):\n${lines.join('\n')}`;
}
