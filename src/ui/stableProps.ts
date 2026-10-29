import { useRef } from 'react';

type Fn = (...args: never[]) => unknown;
type Bag = Record<string, unknown>;

function isPlain(value: unknown): value is Bag {
  return typeof value === 'object' && value !== null && Object.getPrototypeOf(value) === Object.prototype;
}

function sameList(a: unknown, b: unknown): boolean {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
  return a.every((item, i) => Object.is(item, b[i]));
}

class Stabilizer {
  private latest: Bag = {};
  private callers = new Map<string, Fn>();
  private last: Bag = {};

  private caller(path: string[]): Fn {
    const key = path.join('.');
    let fn = this.callers.get(key);
    if (!fn) {
      fn = (...args: never[]) => {
        let target: unknown = this.latest;
        for (const part of path) target = (target as Bag | undefined)?.[part];
        return typeof target === 'function' ? (target as Fn)(...args) : undefined;
      };
      this.callers.set(key, fn);
    }
    return fn;
  }

  private value(path: string[], next: unknown, prev: unknown, nested: ReadonlySet<string>, depth: number): unknown {
    if (typeof next === 'function') return this.caller(path);
    if (depth === 0 && isPlain(next) && nested.has(path[0] ?? '')) return this.bag(path, next, isPlain(prev) ? prev : undefined, nested, depth + 1);
    if (sameList(next, prev)) return prev;
    return next;
  }

  private bag(path: string[], next: Bag, prev: Bag | undefined, nested: ReadonlySet<string>, depth: number): Bag {
    const out: Bag = {};
    let same = prev !== undefined && Object.keys(prev).length === Object.keys(next).length;
    for (const key of Object.keys(next)) {
      const value = this.value([...path, key], next[key], prev?.[key], nested, depth);
      out[key] = value;
      if (!prev || !Object.is(value, prev[key])) same = false;
    }
    return same && prev ? prev : out;
  }

  run<T extends object>(next: T, nested: ReadonlySet<string>): T {
    this.latest = next as Bag;
    this.last = this.bag([], next as Bag, this.last, nested, 0);
    return this.last as T;
  }
}

export function useStableProps<T extends object>(next: T, nested: ReadonlySet<string> = new Set()): T {
  const ref = useRef<Stabilizer | null>(null);
  ref.current ??= new Stabilizer();
  return ref.current.run(next, nested);
}
