import { SOURCE_LOC_ATTR, type ComponentUse } from '../shared/contracts.js';
import { APP_SOURCE_PATH } from '../shared/app.js';

interface DebugType {
  displayName?: unknown;
  name?: unknown;
  render?: DebugType;
  type?: DebugType;
}

interface DebugFiber {
  _debugStack?: { stack?: unknown } | null;
  debugStack?: { stack?: unknown } | null;
  stack?: unknown;
  _debugOwner?: DebugFiber | null;
  return?: DebugFiber | null;
  tag?: number;
  name?: unknown;
  type?: DebugType | string | null;
}

const HOST_COMPONENT = 5;
const MAX_SOURCE_CANDIDATES = 150;
const SOURCE_BATCH = 10;
const pending = new WeakMap<Element, Promise<string | null>>();

export function appSourceMode(): string | null {
  const script = document.currentScript;
  if (!(script instanceof HTMLScriptElement)) return null;
  const state = script.dataset.studioState;
  if (state) (window as unknown as { __STUDIO_STATE__?: { id: string } }).__STUDIO_STATE__ = { id: state };
  return script.dataset.studioApp ?? null;
}

function fiberOf(element: Element): DebugFiber | null {
  for (const key of Object.keys(element)) {
    if (key.startsWith('__reactFiber$')) return (element as unknown as Record<string, DebugFiber>)[key] ?? null;
  }
  return null;
}

export const USED_AT_ATTR = 'data-studio-used-at';

function textName(...values: unknown[]): string | null {
  const found = values.find((value): value is string => typeof value === 'string' && value.length > 0);
  return found ?? null;
}

function ownerName(owner: DebugFiber): string | null {
  const type = owner.type && typeof owner.type !== 'string' ? owner.type : null;
  return textName(owner.name, type?.displayName, type?.render?.displayName, type?.render?.name, type?.type?.displayName, type?.type?.name, type?.name);
}

export function componentUseOf(element: Element): ComponentUse | null {
  const host = hostElementOf(element);
  const owner = host?.fiber._debugOwner ?? null;
  if (!host || !owner) return null;
  const name = ownerName(owner);
  if (!name) return null;
  const parent = host.element.parentElement ? hostElementOf(host.element.parentElement) : null;
  return { name, root: !parent || (parent.fiber._debugOwner ?? null) !== owner };
}

function stackOf(fiber: DebugFiber | null): string | null {
  const candidates = [fiber?._debugStack?.stack, fiber?.debugStack?.stack, fiber?.stack];
  const stack = candidates.find((value): value is string => typeof value === 'string' && value.length > 0);
  return stack ?? null;
}

function fileOf(source: string): string {
  return source.replace(/:\d+:\d+$/, '');
}

function hostElementOf(element: Element): { element: Element; fiber: DebugFiber } | null {
  let current: Element | null = element;
  while (current) {
    const fiber = fiberOf(current);
    if (fiber && (fiber.tag === undefined || fiber.tag === HOST_COMPONENT)) return { element: current, fiber };
    current = current.parentElement;
  }
  return null;
}

async function resolveStacks(stacks: string[]): Promise<(string | null)[]> {
  const response = await fetch(APP_SOURCE_PATH, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ stacks }), cache: 'no-store' });
  if (!response.ok) return stacks.map(() => null);
  const body = (await response.json()) as { sources?: unknown };
  return Array.isArray(body.sources) ? body.sources.map((source) => (typeof source === 'string' ? source : null)) : stacks.map(() => null);
}

export function appHydrated(element: Element): boolean {
  return hostElementOf(element) !== null;
}

export function appSourceFor(element: Element): Promise<string | null> {
  const host = hostElementOf(element);
  if (!host) return Promise.resolve(null);
  const known = host.element.getAttribute(SOURCE_LOC_ATTR);
  if (known) return Promise.resolve(known);
  const existing = pending.get(host.element);
  if (existing) return existing;
  const stacks = [stackOf(host.fiber) ?? '', stackOf(host.fiber._debugOwner ?? null) ?? ''];
  if (stacks.every((stack) => stack === '')) return Promise.resolve(null);
  const lookup = resolveStacks(stacks)
    .then(([own = null, owner = null]) => {
      const source = own ?? owner;
      if (!source) return null;
      host.element.setAttribute(SOURCE_LOC_ATTR, source);
      if (own && owner && fileOf(own) !== fileOf(owner)) host.element.setAttribute(USED_AT_ATTR, owner);
      return source;
    })
    .catch(() => null)
    .finally(() => pending.delete(host.element));
  pending.set(host.element, lookup);
  return lookup;
}

let finding: string | null = null;

export async function appElementBySource(loc: string, tag: string): Promise<Element | null> {
  if (finding === loc || !/^[a-z][a-z0-9-]*$/.test(tag)) return null;
  finding = loc;
  try {
    const candidates = Array.from(document.querySelectorAll(tag)).slice(0, MAX_SOURCE_CANDIDATES);
    for (let start = 0; start < candidates.length; start += SOURCE_BATCH) {
      const batch = candidates.slice(start, start + SOURCE_BATCH);
      const sources = await Promise.all(batch.map(appSourceFor));
      const index = sources.indexOf(loc);
      if (index >= 0) return batch[index] ?? null;
    }
    return null;
  } finally {
    finding = null;
  }
}
