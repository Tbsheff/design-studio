import { useLayoutEffect } from "react";
import type { CSSProperties, RefObject } from "react";

import { pick } from "./pick.js";

const POPOVER_GAP = 4;
const MARGIN = 8;
const RESIZE_EVENT = "resize";

interface PopoverBounds {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

const popoverBounds = (anchor: Element): PopoverBounds => {
  const bounds = {
    bottom: window.innerHeight - MARGIN,
    left: MARGIN,
    right: window.innerWidth - MARGIN,
    top: MARGIN,
  };

  const boundary = anchor.closest("[data-popover-boundary]");

  if (boundary) {
    const rect = boundary.getBoundingClientRect();
    bounds.left = Math.max(bounds.left, rect.left + MARGIN);
    bounds.right = Math.min(bounds.right, rect.right - MARGIN);
  }

  return bounds;
};

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
  const bounds = popoverBounds(trigger);
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

interface LayoutRect {
  readonly left: number;
  readonly right: number;
  readonly top: number;
}

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

const layoutRect = (panel: HTMLElement): LayoutRect => {
  const parent = panel.offsetParent;

  if (!parent) {
    return panel.getBoundingClientRect();
  }

  const base = parent.getBoundingClientRect();
  const left = base.left + panel.offsetLeft;

  return {
    left,
    right: left + panel.offsetWidth,
    top: base.top + panel.offsetTop,
  };
};

const resetFit = (style: CSSStyleDeclaration): void => {
  for (const key of [
    "top",
    "bottom",
    "left",
    "right",
    "maxHeight",
    "maxWidth",
    "overflowY",
  ] as const) {
    style[key] = "";
  }
};

const fitVertical = (
  panel: HTMLElement,
  top: number,
  from: DOMRect,
  bounds: PopoverBounds
): void => {
  const { style } = panel;
  const height = panel.scrollHeight;
  const below = bounds.bottom - top;
  const above = from.top - POPOVER_GAP - bounds.top;
  const flip = height > below && above > below;

  if (flip) {
    style.top = "auto";
    style.bottom = "calc(100% + 6px)";
  }

  if (height > below) {
    style.maxHeight = `${Math.max(0, pick(flip, above, below))}px`;
  }

  if (height > Math.max(above, below)) {
    style.overflowY = "auto";
  }
};

const fitHorizontal = (
  panel: HTMLElement,
  rect: { left: number; right: number },
  bounds: PopoverBounds
): void => {
  const shift = pick(rect.right > bounds.right, bounds.right - rect.right, 0);

  const moved = pick(
    rect.left + shift < bounds.left,
    bounds.left - rect.left,
    shift
  );

  const parent = panel.offsetParent;

  if (moved === 0 || !parent) {
    return;
  }

  panel.style.left = `${rect.left + moved - parent.getBoundingClientRect().left}px`;
  panel.style.right = "auto";
};

const fitAbsolute = (panel: HTMLElement, trigger: HTMLElement | null): void => {
  resetFit(panel.style);
  const anchor = trigger ?? panel.parentElement ?? panel;
  const bounds = popoverBounds(anchor);
  panel.style.maxWidth = `${bounds.right - bounds.left}px`;
  const rect = layoutRect(panel);
  fitVertical(panel, rect.top, anchor.getBoundingClientRect(), bounds);
  fitHorizontal(panel, rect, bounds);
};

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

    const fit = (): void => fitAbsolute(node, trigger?.current ?? null);
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(node);
    globalThis.addEventListener(RESIZE_EVENT, fit);

    return (): void => {
      observer.disconnect();
      globalThis.removeEventListener(RESIZE_EVENT, fit);
    };
  }, [open, panel, trigger]);
};

export { POPOVER_GAP, popoverBounds, placeFixed, useFitPopover, writeFixed };

export type { PopoverBounds, FixedPlacement };
