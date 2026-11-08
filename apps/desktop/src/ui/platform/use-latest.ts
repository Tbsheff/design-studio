import { useLayoutEffect, useRef } from "react";

const useLatest = <Value>(value: Value): { readonly current: Value } => {
  const ref = useRef(value);

  useLayoutEffect(() => {
    ref.current = value;
  });

  return ref;
};

export { useLatest };
