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
const resolvedFrom = new WeakMap<Element, string>();
const STACKS_PER_REQUEST = 20;

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

function stacksOf(fiber: DebugFiber): [string, string] {
  return [stackOf(fiber) ?? '', stackOf(fiber._debugOwner ?? null) ?? ''];
}

function freshSource(element: Element, stacks: [string, string]): string | null {
  const known = element.getAttribute(SOURCE_LOC_ATTR);
  if (!known) return null;
  const from = resolvedFrom.get(element);
  return from === undefined || from === stacks.join('\u0001') ? known : null;
}

function writeSource(element: Element, stacks: [string, string], own: string | null, owner: string | null): string | null {
  resolvedFrom.set(element, stacks.join('\u0001'));
  const source = own ?? owner;
  if (!source) {
    element.removeAttribute(SOURCE_LOC_ATTR);
    element.removeAttribute(USED_AT_ATTR);
    return null;
  }
  element.setAttribute(SOURCE_LOC_ATTR, source);
  if (own && owner && fileOf(own) !== fileOf(owner)) element.setAttribute(USED_AT_ATTR, owner);
  else element.removeAttribute(USED_AT_ATTR);
  return source;
}

export function appSourceFor(element: Element): Promise<string | null> {
  const host = hostElementOf(element);
  if (!host) return Promise.resolve(null);
  const stacks = stacksOf(host.fiber);
  const known = freshSource(host.element, stacks);
  if (known) return Promise.resolve(known);
  const existing = pending.get(host.element);
  if (existing) return existing;
  if (stacks.every((stack) => stack === '')) return Promise.resolve(host.element.getAttribute(SOURCE_LOC_ATTR));
  const lookup = resolveStacks(stacks)
    .then(([own = null, owner = null]) => writeSource(host.element, stacks, own, owner))
    .catch(() => null)
    .finally(() => pending.delete(host.element));
  pending.set(host.element, lookup);
  return lookup;
}

async function resolveMany(stacks: string[]): Promise<Map<string, string | null>> {
  const found = new Map<string, string | null>();
  const chunks: string[][] = [];
  for (let start = 0; start < stacks.length; start += STACKS_PER_REQUEST) chunks.push(stacks.slice(start, start + STACKS_PER_REQUEST));
  await Promise.all(
    chunks.map(async (chunk) => {
      const sources = await resolveStacks(chunk).catch(() => chunk.map(() => null));
      chunk.forEach((stack, index) => found.set(stack, sources[index] ?? null));
    }),
  );
  return found;
}

export async function primeAppSources(): Promise<boolean> {
  const stale: { element: Element; stacks: [string, string] }[] = [];
  for (const element of document.body.querySelectorAll('*')) {
    const fiber = fiberOf(element);
    if (!fiber || (fiber.tag !== undefined && fiber.tag !== HOST_COMPONENT) || pending.has(element)) continue;
    const stacks = stacksOf(fiber);
    if (stacks.every((stack) => stack === '') || freshSource(element, stacks)) continue;
    stale.push({ element, stacks });
  }
  if (stale.length === 0) return false;
  const sources = await resolveMany([...new Set(stale.flatMap((item) => item.stacks.filter((stack) => stack !== '')))]);
  for (const { element, stacks } of stale) writeSource(element, stacks, sources.get(stacks[0]) ?? null, sources.get(stacks[1]) ?? null);
  return true;
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
