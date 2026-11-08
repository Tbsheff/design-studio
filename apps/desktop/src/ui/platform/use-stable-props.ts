import { useMemo } from "react";

import { createLiveStore } from "./live-store.js";
import type { LiveStore } from "./live-store.js";

type Prop = ReturnType<typeof Reflect.get>;

type Bag = Record<string, Prop>;

type Caller = (...args: never[]) => void;

interface Stabilizer {
  readonly callers: Map<string, Caller>;
  readonly last: LiveStore<Bag>;
  readonly latest: LiveStore<Bag>;
  readonly nested: LiveStore<ReadonlySet<string>>;
}

const createStabilizer = (): Stabilizer => ({
  callers: new Map<string, Caller>(),
  last: createLiveStore<Bag>({}),
  latest: createLiveStore<Bag>({}),
  nested: createLiveStore<ReadonlySet<string>>(new Set<string>()),
});

const isFunction = (value: Prop): value is Caller =>
  Object.prototype.isPrototypeOf.call(Function.prototype, value);

const isPlain = (value: Prop): value is Bag =>
  value instanceof Object && Object.getPrototypeOf(value) === Object.prototype;

const isSameList = (first: Prop, second: Prop): boolean => {
  if (
    !Array.isArray(first) ||
    !Array.isArray(second) ||
    first.length !== second.length
  ) {
    return false;
  }

  return first.every((item, index) => Object.is(item, second[index]));
};

const toProp = (source: Bag | null, key: string): Prop => {
  if (source === null) {
    return null;
  }

  return source[key];
};

const toTarget = (root: Bag, path: readonly string[]): Prop => {
  let current: Prop = root;

  for (const part of path) {
    if (!(current instanceof Object)) {
      return null;
    }

    current = current[part];
  }

  return current;
};

const toCaller = (stabilizer: Stabilizer, path: readonly string[]): Caller => {
  const key = path.join(".");
  const existing = stabilizer.callers.get(key);

  if (existing) {
    return existing;
  }

  const created: Caller = (...args) => {
    const target = toTarget(stabilizer.latest.get(), path);

    if (isFunction(target)) {
      return target(...args);
    }

    return null;
  };

  stabilizer.callers.set(key, created);

  return created;
};

const isNestable = (stabilizer: Stabilizer, path: readonly string[]): boolean =>
  path.length === 0 ||
  (path.length === 1 && stabilizer.nested.get().has(path[0] ?? ""));

const toStable = (
  stabilizer: Stabilizer,
  path: readonly string[],
  next: Prop,
  prev: Prop
): Prop => {
  if (isFunction(next)) {
    return toCaller(stabilizer, path);
  }

  if (isNestable(stabilizer, path) && isPlain(next)) {
    let before: Bag | null = null;

    if (isPlain(prev)) {
      before = prev;
    }

    const entries = Object.entries(next);

    const out = Object.fromEntries(
      entries.map(([key, item]) => [
        key,
        toStable(stabilizer, [...path, key], item, toProp(before, key)),
      ])
    );

    const isSame =
      before !== null &&
      Object.keys(before).length === entries.length &&
      entries.every(([key]) =>
        Object.is(toProp(out, key), toProp(before, key))
      );

    if (isSame) {
      return before;
    }

    return out;
  }

  if (isSameList(next, prev)) {
    return prev;
  }

  return next;
};

const runStabilizer = <Value extends object>(
  stabilizer: Stabilizer,
  next: Value,
  nested: ReadonlySet<string>
): Value => {
  stabilizer.latest.set(next);
  stabilizer.nested.set(nested);
  const last = toStable(stabilizer, [], next, stabilizer.last.get());
  stabilizer.last.set(last);

  return last;
};

const useStableProps = <Value extends object>(
  next: Value,
  nested: ReadonlySet<string>
): Value => {
  const stabilizer = useMemo(() => createStabilizer(), []);

  return runStabilizer(stabilizer, next, nested);
};

export { useStableProps };
