import { useEffect, useRef } from "react";
import type { RefObject } from "react";

import { findElement } from "./find-element.js";

const HEAD_TOGGLE = ".version.head .version-toggle";

const useHeadFocus = (
  headVersionId: string | null
): RefObject<HTMLUListElement | null> => {
  const ref = useRef<HTMLUListElement>(null);

  useEffect(() => {
    const frame = globalThis.requestAnimationFrame(() => {
      const isLost =
        !document.activeElement || document.activeElement === document.body;

      if (isLost && headVersionId !== null && ref.current) {
        findElement(ref.current, HEAD_TOGGLE)?.focus({ preventScroll: true });
      }
    });

    return (): void => globalThis.cancelAnimationFrame(frame);
  }, [headVersionId]);

  return ref;
};

export { useHeadFocus };
