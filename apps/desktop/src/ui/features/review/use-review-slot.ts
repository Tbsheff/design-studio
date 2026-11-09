import { useCallback, useState } from "react";

import { findElement } from "../../platform/find-element.js";

const CANVAS_SELECTOR = ".canvas";
const SLOT_SELECTOR = '[data-topbar-slot="review"]';

interface ReviewSlot {
  readonly markerRef: (node: HTMLSpanElement | null) => void;
  readonly slot: HTMLElement | null;
}

const toCanvas = (marker: HTMLElement | null): HTMLElement | null => {
  let node = marker;

  while (node && !node.matches(CANVAS_SELECTOR)) {
    node = node.parentElement;
  }

  return node;
};

const toSlot = (marker: HTMLElement | null): HTMLElement | null => {
  const canvas = toCanvas(marker);

  if (!canvas) {
    return null;
  }

  return (
    findElement(canvas, SLOT_SELECTOR) ??
    findElement(document.body, SLOT_SELECTOR)
  );
};

const useReviewSlot = (): ReviewSlot => {
  const [slot, setSlot] = useState<HTMLElement | null>(null);

  const markerRef = useCallback((node: HTMLSpanElement | null): void => {
    setSlot(toSlot(node));
  }, []);

  return { markerRef, slot };
};

export { useReviewSlot };

export type { ReviewSlot };
