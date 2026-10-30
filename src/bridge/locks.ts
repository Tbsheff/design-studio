import { SOURCE_LOC_ATTR } from '../shared/contracts.js';
import { USED_AT_ATTR } from './app-source.js';
import { pathOf } from './select-match.js';

const KEYS_MAX = 500;
const KEY_MAX = 2000;
const PRIME_DELAY_MS = 250;
const SOURCE_KEY = /^(?:use:([^|]*)\|)?loc:(.*)#(\d+)$/;

export interface LockSet {
  set(keys: unknown): void;
  keys(): string[];
  lock(element: Element, locked: boolean): Promise<string[]>;
  ownLocked(element: Element): boolean;
  isLocked(element: Element): boolean;
  hit(event: Event, element: Element | null): Element | null;
  refresh(): string[] | null;
}

export interface AppSources {
  prime(): Promise<boolean>;
  source(element: Element): Promise<string | null>;
}

function sameSource(own: string, used: string | null): Element[] {
  return Array.from(document.querySelectorAll(`[${SOURCE_LOC_ATTR}="${CSS.escape(own)}"]`)).filter((element) => element.getAttribute(USED_AT_ATTR) === used);
}

function sourceKey(element: Element, own: string, used: string | null): string {
  const index = Math.max(0, sameSource(own, used).indexOf(element));
  return `${used ? `use:${used}|` : ''}loc:${own}#${index}`;
}

function pageOf(key: string): { page: string; rest: string } {
  const at = key.indexOf('|');
  return at < 0 ? { page: '', rest: key } : { page: key.slice(0, at), rest: key.slice(at + 1) };
}

function isSourceKey(raw: string): boolean {
  return SOURCE_KEY.test(pageOf(raw).rest);
}

function resolveKey(raw: string): Element | null {
  const { page, rest: key } = pageOf(raw);
  if (page !== window.location.pathname) return null;
  try {
    if (key.startsWith('sel:')) return document.querySelector(key.slice(4));
    const match = SOURCE_KEY.exec(key);
    if (!match) return null;
    return sameSource(match[2] ?? '', match[1] ?? null)[Number(match[3])] ?? null;
  } catch {
    return null;
  }
}

function pointOf(event: Event): { x: number; y: number } | null {
  return event instanceof MouseEvent ? { x: event.clientX, y: event.clientY } : null;
}

function syncKeyOf(element: Element, app: AppSources | null): string {
  const loc = app ? null : element.getAttribute(SOURCE_LOC_ATTR);
  return `${window.location.pathname}|${loc ? sourceKey(element, loc, null) : `sel:${pathOf(element)}`}`;
}

async function appKeyOf(element: Element, app: AppSources): Promise<string> {
  await app.prime();
  const own = (await app.source(element)) && element.getAttribute(SOURCE_LOC_ATTR);
  if (!own) return syncKeyOf(element, app);
  return `${window.location.pathname}|${sourceKey(element, own, element.getAttribute(USED_AT_ATTR))}`;
}

function upgradedKey(key: string): string | null {
  const { page, rest } = pageOf(key);
  if (!rest.startsWith('sel:')) return null;
  const element = resolveKey(key);
  const own = element?.getAttribute(SOURCE_LOC_ATTR);
  return element && own ? `${page}|${sourceKey(element, own, element.getAttribute(USED_AT_ATTR))}` : null;
}

export function createLockSet(app: AppSources | null, onResolved: (keys: string[] | null) => void): LockSet {
  let keys = new Set<string>();
  const held = new Map<string, Element>();
  let cache: Element[] | null = null;
  let cacheFrame = 0;
  let primeTimer = 0;

  const keyOf = (element: Element): Promise<string> => (app ? appKeyOf(element, app) : Promise.resolve(syncKeyOf(element, null)));

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

  const upgrade = (): boolean => {
    let changed = false;
    for (const key of [...keys]) {
      const next = upgradedKey(key);
      if (!next) continue;
      keys.delete(key);
      held.delete(key);
      keys.add(next);
      changed = true;
    }
    return changed;
  };

  const prime = (): void => {
    if (!app || primeTimer || keys.size === 0) return;
    primeTimer = window.setTimeout(() => {
      primeTimer = 0;
      void app.prime().then((changed) => {
        const upgraded = upgrade();
        if (!changed && !upgraded) return;
        held.clear();
        reset();
        onResolved(upgraded ? [...keys] : null);
      }).catch(() => undefined);
    }, PRIME_DELAY_MS);
  };

  const unlock = (element: Element, key: string): void => {
    for (const known of [...keys]) {
      if (known !== key && held.get(known) !== element && resolveKey(known) !== element) continue;
      keys.delete(known);
      held.delete(known);
    }
  };

  const isLocked = (element: Element): boolean => lockedElements().some((locked) => locked === element || locked.contains(element));

  return {
    set(next) {
      const list = Array.isArray(next) ? next.filter((key): key is string => typeof key === 'string' && key.length <= KEY_MAX) : [];
      keys = new Set(list.slice(0, KEYS_MAX));
      for (const key of [...held.keys()]) if (!keys.has(key)) held.delete(key);
      reset();
      prime();
    },
    keys: () => [...keys],
    async lock(element, locked) {
      const key = await keyOf(element);
      if (locked) {
        keys.add(key);
        held.set(key, element);
      } else unlock(element, key);
      reset();
      return [...keys];
    },
    ownLocked: (element) => lockedElements().includes(element),
    isLocked,
    refresh() {
      let changed = false;
      for (const [key, element] of [...held]) {
        if (app && isSourceKey(key)) {
          held.delete(key);
          continue;
        }
        const next = element.isConnected ? syncKeyOf(element, app) : key;
        if (next === key) continue;
        keys.delete(key);
        held.delete(key);
        keys.add(next);
        held.set(next, element);
        changed = true;
      }
      reset();
      prime();
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
