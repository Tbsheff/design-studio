import { useEffect, useRef } from "react";
import type { RefObject } from "react";

const useScrollInOnMount = (
  isOn: boolean
): RefObject<HTMLSpanElement | null> => {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (isOn) {
      ref.current?.closest("section")?.scrollIntoView({ block: "nearest" });
    }
  }, [isOn]);

  return ref;
};

export { useScrollInOnMount };
