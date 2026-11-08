import { useLayoutEffect, useRef } from "react";
import type { RefObject } from "react";

const useLatestRef = <Value>(value: Value): RefObject<Value> => {
  const ref = useRef(value);

  useLayoutEffect(() => {
    ref.current = value;
  });

  return ref;
};

export { useLatestRef };
