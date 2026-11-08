import { useMemo } from "react";
import type { RefObject } from "react";

import { useLatestRef } from "./use-latest-ref.js";

const FUNCTION_TAG = /Function\]$/u;

type AnyFunction = (...args: never[]) => void;

const toWrapper =
  <Props extends object>(latest: RefObject<Props>, key: string): AnyFunction =>
  (...args: never[]): void =>
    Object.entries(latest.current).find(([name]) => name === key)?.[1]?.(
      ...args
    );

const toStableEntry = <Props extends object, Value>(
  key: string,
  value: Value,
  latest: RefObject<Props>,
  wrappers: Map<string, AnyFunction>
): [string, Value | AnyFunction] => {
  if (!FUNCTION_TAG.test(Object.prototype.toString.call(value))) {
    return [key, value];
  }

  const known = wrappers.get(key) ?? toWrapper(latest, key);
  wrappers.set(key, known);

  return [key, known];
};

const useStableCallbacks = <Props extends object>(props: Props): Props => {
  const latest = useLatestRef(props);
  const wrappers = useMemo(() => new Map<string, AnyFunction>(), []);

  return Object.fromEntries(
    Object.entries(props).map(([key, value]) =>
      toStableEntry(key, value, latest, wrappers)
    )
  ) as Props;
};

export { useStableCallbacks };
