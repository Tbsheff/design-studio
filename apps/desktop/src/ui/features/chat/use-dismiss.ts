import { useEffect, useRef } from "react";
import type { RefObject } from "react";

const useDismiss = <Element extends HTMLElement>(
  onClose: () => void
): RefObject<Element | null> => {
  const ref = useRef<Element>(null);
  useEffect(() => {
    const onDown = (event: MouseEvent): void => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        onClose();
      }
    };

    document.addEventListener("mousedown", onDown);

    return (): void => document.removeEventListener("mousedown", onDown);
  }, [onClose]);

  return ref;
};

export { useDismiss };
