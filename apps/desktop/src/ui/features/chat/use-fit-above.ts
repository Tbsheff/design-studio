import { useLayoutEffect } from "react";
import type { RefObject } from "react";

const MIN_POPOVER_HEIGHT = 120;
const POP_GAP = 8;

const useFitAbove = <Element extends HTMLElement>(
  ref: RefObject<Element | null>,
  max: number
): void => {
  useLayoutEffect(() => {
    const pop = ref.current;
    const anchor = pop?.parentElement;
    const bounds = pop?.closest("aside");

    if (!pop || !anchor) {
      return;
    }

    const fit = (): void => {
      const top = bounds?.getBoundingClientRect().top ?? 0;

      const room =
        anchor.getBoundingClientRect().top - Math.max(0, top) - POP_GAP;

      pop.style.maxHeight = `${Math.max(MIN_POPOVER_HEIGHT, Math.min(max, room))}px`;
    };

    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(anchor);
    observer.observe(globalThis.document.documentElement);

    return (): void => observer.disconnect();
  }, [ref, max]);
};

export { useFitAbove };
