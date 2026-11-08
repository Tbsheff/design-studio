import { useEffect, useRef } from "react";
import type { MutableRefObject } from "react";

const useLatest = <Value>(value: Value): MutableRefObject<Value> => {
  const ref = useRef(value);

  useEffect(() => {
    ref.current = value;
  });

  return ref;
};

const writeRef = <Value>(ref: MutableRefObject<Value>, value: Value): void => {
  ref.current = value;
};

export { useLatest, writeRef };
