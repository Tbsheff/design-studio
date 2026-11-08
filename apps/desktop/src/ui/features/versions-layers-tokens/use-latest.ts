import { useCallback, useLayoutEffect, useRef } from "react";

const useLatest = <Args extends unknown[], Result>(
  fn: (...args: Args) => Result
): ((...args: Args) => Result) => {
  const ref = useRef(fn);

  useLayoutEffect(() => {
    ref.current = fn;
  });

  return useCallback((...args: Args): Result => ref.current(...args), []);
};

export { useLatest };
