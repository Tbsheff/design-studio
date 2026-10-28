import { SOURCE_LOC_ATTR } from '../shared/contracts.js';

const KEYS_MAX = 500;
const KEY_MAX = 2000;

export interface LockSet {
  set(keys: unknown): void;
  keys(): string[];
  lock(element: Element, locked: boolean): string[];
  ownLocked(element: Element): boolean;
  isLocked(element: Element): boolean;
  hit(event: Event, element: Element | null): Element | null;
}

function locKey(element: Element, loc: string): string {
  const same = document.querySelectorAll(`[${SOURCE_LOC_ATTR}="${CSS.escape(loc)}"]`);
  return `loc:${loc}#${Math.max(0, Array.prototype.indexOf.call(same, element))}`;
}

function resolveKey(key: string): Element | null {
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

export function createLockSet(selectorOf: (element: Element) => string, useLoc: boolean): LockSet {
  let keys = new Set<string>();
  let cache: Element[] | null = null;
  let cacheFrame = 0;

  const keyOf = (element: Element): string => {
    const loc = useLoc ? element.getAttribute(SOURCE_LOC_ATTR) : null;
    return loc ? locKey(element, loc) : `sel:${selectorOf(element)}`;
  };

  const lockedElements = (): Element[] => {
    if (keys.size === 0) return [];
    if (cache) return cache;
    cache = [...keys].map(resolveKey).filter((element): element is Element => element !== null);
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
      reset();
    },
    keys: () => [...keys],
    lock(element, locked) {
      const key = keyOf(element);
      if (locked) keys.add(key);
      else for (const known of [...keys]) if (known === key || resolveKey(known) === element) keys.delete(known);
      reset();
      return [...keys];
    },
    ownLocked: (element) => lockedElements().includes(element),
    isLocked,
    hit(event, element) {
      if (!element || keys.size === 0 || !isLocked(element)) return element;
      const point = pointOf(event);
      if (!point) return null;
      return document.elementsFromPoint(point.x, point.y).find((candidate) => candidate !== document.documentElement && !isLocked(candidate)) ?? null;
    },
  };
}
