import { SOURCE_LOC_ATTR } from '../shared/contracts.js';
import { pathOf } from './select-match.js';

const KEYS_MAX = 500;
const KEY_MAX = 2000;

export interface LockSet {
  set(keys: unknown): void;
  keys(): string[];
  lock(element: Element, locked: boolean): string[];
  ownLocked(element: Element): boolean;
  isLocked(element: Element): boolean;
  hit(event: Event, element: Element | null): Element | null;
  refresh(): string[] | null;
}

function locKey(element: Element, loc: string): string {
  const same = document.querySelectorAll(`[${SOURCE_LOC_ATTR}="${CSS.escape(loc)}"]`);
  return `loc:${loc}#${Math.max(0, Array.prototype.indexOf.call(same, element))}`;
}

function pageOf(key: string): { page: string; rest: string } {
  const at = key.indexOf('|');
  return at < 0 ? { page: '', rest: key } : { page: key.slice(0, at), rest: key.slice(at + 1) };
}

function resolveKey(raw: string): Element | null {
  const { page, rest: key } = pageOf(raw);
  if (page !== window.location.pathname) return null;
  try {
    if (key.startsWith('sel:')) return document.querySelector(key.slice(4));
    const match = /^loc:(.*)#(\d+)$/.exec(key);
    if (!match) return null;
    return document.querySelectorAll(`[${SOURCE_LOC_ATTR}="${CSS.escape(match[1] ?? '')}"]`)[Number(match[2])] ?? null;
  } catch {
    return null;
  }
}

function pointOf(event: Event): { x: number; y: number } | null {
  return event instanceof MouseEvent ? { x: event.clientX, y: event.clientY } : null;
}

export function createLockSet(useLoc: boolean): LockSet {
  let keys = new Set<string>();
  const held = new Map<string, Element>();
  let cache: Element[] | null = null;
  let cacheFrame = 0;

  const keyOf = (element: Element): string => {
    const loc = useLoc ? element.getAttribute(SOURCE_LOC_ATTR) : null;
    return `${window.location.pathname}|${loc ? locKey(element, loc) : `sel:${pathOf(element)}`}`;
  };

  const lockedElements = (): Element[] => {
    if (keys.size === 0) return [];
    if (cache) return cache;
    cache = [...keys].map((key) => {
      const known = held.get(key);
      if (known?.isConnected) return known;
      const found = resolveKey(key);
      if (found) held.set(key, found);
      return found;
    }).filter((element): element is Element => element !== null);
    cacheFrame = window.requestAnimationFrame(() => {
      cache = null;
      cacheFrame = 0;
    });
    return cache;
  };

  const reset = (): void => {
    if (cacheFrame) window.cancelAnimationFrame(cacheFrame);
    cache = null;
    cacheFrame = 0;
  };

  const isLocked = (element: Element): boolean => lockedElements().some((locked) => locked === element || locked.contains(element));

  return {
    set(next) {
      const list = Array.isArray(next) ? next.filter((key): key is string => typeof key === 'string' && key.length <= KEY_MAX) : [];
      keys = new Set(list.slice(0, KEYS_MAX));
      for (const key of [...held.keys()]) if (!keys.has(key)) held.delete(key);
      reset();
    },
    keys: () => [...keys],
    lock(element, locked) {
      const key = keyOf(element);
      if (locked) {
        keys.add(key);
        held.set(key, element);
      } else {
        for (const known of [...keys]) {
          if (known !== key && held.get(known) !== element && resolveKey(known) !== element) continue;
          keys.delete(known);
          held.delete(known);
        }
      }
      reset();
      return [...keys];
    },
    ownLocked: (element) => lockedElements().includes(element),
    isLocked,
    refresh() {
      let changed = false;
      for (const [key, element] of [...held]) {
        const next = element.isConnected ? keyOf(element) : key;
        if (next === key) continue;
        keys.delete(key);
        held.delete(key);
        keys.add(next);
        held.set(next, element);
        changed = true;
      }
      if (changed) reset();
      return changed ? [...keys] : null;
    },
    hit(event, element) {
      if (!element || keys.size === 0 || !isLocked(element)) return element;
      const point = pointOf(event);
      if (!point) return null;
      return document.elementsFromPoint(point.x, point.y).find((candidate) => candidate !== document.documentElement && !isLocked(candidate)) ?? null;
    },
  };
}
