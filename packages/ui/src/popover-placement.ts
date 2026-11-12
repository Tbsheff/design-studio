import { useLayoutEffect } from "react";
import type { CSSProperties, RefObject } from "react";

import { pick } from "./pick.js";
import { fitLifted, liftPanel } from "./top-layer.js";

const POPOVER_GAP = 4;
const MARGIN = 8;
const RESIZE_EVENT = "resize";

interface PopoverBounds {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

const popoverBounds = (): PopoverBounds => ({
  bottom: window.innerHeight - MARGIN,
  left: MARGIN,
  right: window.innerWidth - MARGIN,
  top: MARGIN,
});

interface FixedPlacement {
  align?: "start" | "end";
  prefer?: "above" | "below";
}

const placeFixed = (
  trigger: HTMLElement,
  panel: HTMLElement,
  { align = "start", prefer = "below" }: FixedPlacement = {}
): CSSProperties => {
  const rect = trigger.getBoundingClientRect();
  const bounds = popoverBounds();
  const room = bounds.right - bounds.left;
  const width = Math.min(panel.offsetWidth, room);
  const height = panel.scrollHeight;
  const above = rect.top - POPOVER_GAP - bounds.top;
  const below = bounds.bottom - rect.bottom - POPOVER_GAP;
  const isAbovePreferred = prefer === "above";
  const first = pick(isAbovePreferred, above, below);
  const second = pick(isAbovePreferred, below, above);
  const keep = first >= height || first >= second;
  const onTop = pick(isAbovePreferred, keep, !keep);
  const wanted = pick(align === "end", rect.right - width, rect.left);
  const left = Math.min(Math.max(bounds.left, wanted), bounds.right - width);
  const space = Math.max(0, pick(onTop, above, below));

  const vertical: CSSProperties = pick(
    onTop,
    { bottom: window.innerHeight - rect.top + POPOVER_GAP },
    { top: rect.bottom + POPOVER_GAP }
  );

  const placement: CSSProperties = {
    ...vertical,
    left,
    maxHeight: space,
    maxWidth: room,
  };

  if (height > space) {
    placement.overflowY = "auto";
  }

  return placement;
};

const PX_KEYS = new Set(["left", "top", "bottom", "maxHeight", "maxWidth"]);

const toKebab = (key: string): string =>
  key.replaceAll(/[A-Z]/gu, (letter) => `-${letter.toLowerCase()}`);

const writeFixed = (panel: HTMLElement, placed: CSSProperties): void => {
  const { style } = panel;
  style.removeProperty("opacity");
  style.removeProperty("pointer-events");

  for (const [key, value] of Object.entries(placed)) {
    style.setProperty(
      toKebab(key),
      `${value}${pick(PX_KEYS.has(key), "px", "")}`
    );
  }
};

const SCROLL_EVENT = "scroll";

const useFitPopover = (
  panel: RefObject<HTMLElement | null>,
  trigger: RefObject<HTMLElement | null> | null,
  open: boolean
): void => {
  useLayoutEffect(() => {
    const node = panel.current;

    if (!open || !node) {
      return;
    }

    const anchor = trigger?.current ?? node.parentElement ?? node;
    const plan = liftPanel(node, anchor);

    const fit = (event: Event | null): void => {
      if (event?.target instanceof Node && node.contains(event.target)) {
        return;
      }

      fitLifted(node, anchor, plan);
    };

    const observer = new ResizeObserver(() => fit(null));
    observer.observe(node);
    globalThis.addEventListener(RESIZE_EVENT, fit);
    globalThis.addEventListener(SCROLL_EVENT, fit, true);

    return (): void => {
      observer.disconnect();
      globalThis.removeEventListener(RESIZE_EVENT, fit);
      globalThis.removeEventListener(SCROLL_EVENT, fit, true);
    };
  }, [open, panel, trigger]);
};

export { POPOVER_GAP, popoverBounds, placeFixed, useFitPopover, writeFixed };

export type { PopoverBounds, FixedPlacement };
