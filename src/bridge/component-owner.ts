import { OWNERS_MAX, OWNER_STACK_MAX, type ComponentOwner } from '../shared/props.js';

interface OwnerFiber {
  tag?: number;
  type?: unknown;
  return?: OwnerFiber | null;
  _debugStack?: { stack?: unknown } | null;
}

const COMPONENT_TAGS = new Set([0, 1, 11, 14, 15]);
const STACK_LINES = 12;

function fiberOf(element: Element): OwnerFiber | null {
  for (const key of Object.keys(element)) {
    if (key.startsWith('__reactFiber$')) return (element as unknown as Record<string, OwnerFiber>)[key] ?? null;
  }
  return null;
}

function nameOf(type: unknown): string {
  if (typeof type !== 'function' && (typeof type !== 'object' || type === null)) return '';
  const named = type as { displayName?: unknown; name?: unknown; render?: unknown; type?: unknown };
  for (const value of [named.displayName, named.name]) if (typeof value === 'string' && value) return value;
  if (named.render) return nameOf(named.render);
  if (named.type) return nameOf(named.type);
  return '';
}

function stackOf(fiber: OwnerFiber): string {
  const raw = fiber._debugStack?.stack;
  if (typeof raw !== 'string') return '';
  return raw.split('\n').slice(0, STACK_LINES).join('\n').slice(0, OWNER_STACK_MAX);
}

export function componentOwners(element: Element): ComponentOwner[] {
  let current: Element | null = element;
  let fiber: OwnerFiber | null = null;
  while (current && !fiber) {
    fiber = fiberOf(current);
    current = current.parentElement;
  }
  const owners: ComponentOwner[] = [];
  let guard = 0;
  while (fiber && owners.length < OWNERS_MAX && guard < 400) {
    guard += 1;
    if (fiber.tag !== undefined && COMPONENT_TAGS.has(fiber.tag)) {
      const name = nameOf(fiber.type);
      const stack = stackOf(fiber);
      const last = owners.at(-1);
      if (/^[A-Z]/.test(name) && stack && last?.stack !== stack) owners.push({ name: name.slice(0, 64), stack });
    }
    fiber = fiber.return ?? null;
  }
  return owners;
}
