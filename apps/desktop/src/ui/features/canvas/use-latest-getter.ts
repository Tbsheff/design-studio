import { useCallback, useLayoutEffect, useRef } from "react";

const useLatestGetter = <Value>(value: Value): (() => Value) => {
  const ref = useRef(value);

  useLayoutEffect(() => {
    ref.current = value;
  });

  return useCallback((): Value => ref.current, []);
};

export { useLatestGetter };
