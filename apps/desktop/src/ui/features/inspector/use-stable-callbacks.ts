import { useRef } from "react";

type AnyFn = (...args: never[]) => unknown;

const useStableCallbacks = <P extends object>(props: P): P => {
  const latest = useRef(props);
  latest.current = props;
  const wrappers = useRef(new Map<string, AnyFn>());
  const out: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(props)) {
    if (typeof value !== "function") {
      out[key] = value;
      continue;
    }

    let wrapper = wrappers.current.get(key);

    if (!wrapper) {
      wrapper = (...args: never[]): unknown =>
        (latest.current as Record<string, AnyFn | undefined>)[key]?.(...args);
      wrappers.current.set(key, wrapper);
    }

    out[key] = wrapper;
  }

  return out as P;
};

export { useStableCallbacks };
