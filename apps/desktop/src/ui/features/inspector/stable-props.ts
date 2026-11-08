import { useRef } from "react";

type Fn = (...args: never[]) => unknown;

type Bag = Record<string, unknown>;

const isPlain = (value: unknown): value is Bag =>
  typeof value === "object" &&
  value !== null &&
  Object.getPrototypeOf(value) === Object.prototype;

const isSameList = (first: unknown, second: unknown): boolean => {
  if (
    !Array.isArray(first) ||
    !Array.isArray(second) ||
    first.length !== second.length
  ) {
    return false;
  }

  return first.every((item, index) => Object.is(item, second[index]));
};

class Stabilizer {
  private latest: Bag = {};
  private callers = new Map<string, Fn>();
  private last: Bag = {};

  private caller(path: string[]): Fn {
    const key = path.join(".");
    let fn = this.callers.get(key);

    if (!fn) {
      fn = (...args: never[]): unknown => {
        let target: unknown = this.latest;

        for (const part of path) {
          target = (target as Bag | undefined)?.[part];
        }

        return typeof target === "function"
          ? (target as Fn)(...args)
          : undefined;
      };

      this.callers.set(key, fn);
    }

    return fn;
  }

  private value(
    path: string[],
    next: unknown,
    prev: unknown,
    nested: ReadonlySet<string>,
    depth: number
  ): unknown {
    if (typeof next === "function") {
      return this.caller(path);
    }

    if (depth === 0 && isPlain(next) && nested.has(path[0] ?? "")) {
      return this.bag(
        path,
        next,
        isPlain(prev) ? prev : undefined,
        nested,
        depth + 1
      );
    }

    if (isSameList(next, prev)) {
      return prev;
    }

    return next;
  }

  private bag(
    path: string[],
    next: Bag,
    prev: Bag | undefined,
    nested: ReadonlySet<string>,
    depth: number
  ): Bag {
    const out: Bag = {};

    let same =
      prev !== undefined &&
      Object.keys(prev).length === Object.keys(next).length;

    for (const key of Object.keys(next)) {
      const value = this.value(
        [...path, key],
        next[key],
        prev?.[key],
        nested,
        depth
      );

      out[key] = value;

      if (!prev || !Object.is(value, prev[key])) {
        same = false;
      }
    }

    return same && prev ? prev : out;
  }

  run<T extends object>(next: T, nested: ReadonlySet<string>): T {
    this.latest = next as Bag;
    this.last = this.bag([], next as Bag, this.last, nested, 0);

    return this.last as T;
  }
}

const useStableProps = <T extends object>(
  next: T,
  nested: ReadonlySet<string> = new Set()
): T => {
  const ref = useRef<Stabilizer | null>(null);
  ref.current ??= new Stabilizer();

  return ref.current.run(next, nested);
};

export { useStableProps };
