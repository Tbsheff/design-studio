import { pick } from "./pick.js";

const LAYER_ATTR = "data-top-layer";
const EDGE = 8;
const GAP = 4;

interface LiftPlan {
  readonly offsetX: number;
  readonly isAbove: boolean;
}

interface LayoutBox {
  readonly left: number;
  readonly top: number;
}

const toLayoutBox = (panel: HTMLElement): LayoutBox => {
  const parent = panel.offsetParent;

  if (!parent) {
    return panel.getBoundingClientRect();
  }

  const base = parent.getBoundingClientRect();

  return {
    left: base.left + panel.offsetLeft - parent.scrollLeft,
    top: base.top + panel.offsetTop - parent.scrollTop,
  };
};

const isLifted = (panel: HTMLElement): boolean =>
  panel.hasAttribute(LAYER_ATTR) && panel.matches(":popover-open");

const showOnTop = (panel: HTMLElement): void => {
  if (isLifted(panel)) {
    return;
  }

  panel.setAttribute(LAYER_ATTR, "");

  if (!panel.hasAttribute("popover")) {
    panel.setAttribute("popover", "manual");
  }

  panel.showPopover();
};

const pinFixed = (style: CSSStyleDeclaration): void => {
  style.position = "fixed";
  style.inset = "auto";
  style.margin = "0";
};

const toLeft = (anchor: DOMRect, plan: LiftPlan, width: number): number => {
  const right = globalThis.innerWidth - EDGE;
  const wanted = anchor.left + plan.offsetX;

  if (wanted < EDGE && anchor.left + width <= right) {
    return anchor.left;
  }

  if (wanted + width > right && anchor.right - width >= EDGE) {
    return anchor.right - width;
  }

  return Math.max(EDGE, Math.min(wanted, right - width));
};

const fitTop = (
  style: CSSStyleDeclaration,
  anchor: DOMRect,
  plan: LiftPlan,
  height: number
): void => {
  const below = globalThis.innerHeight - EDGE - (anchor.bottom + GAP);
  const above = anchor.top - GAP - EDGE;
  const first = pick(plan.isAbove, above, below);
  const second = pick(plan.isAbove, below, above);
  const isKept = first >= height || first >= second;
  const isAbove = pick(plan.isAbove, isKept, !isKept);
  const room = Math.max(0, pick(isAbove, above, below));
  const shown = Math.min(height, room);
  const top = pick(isAbove, anchor.top - GAP - shown, anchor.bottom + GAP);

  style.top = `${Math.round(Math.max(EDGE, top))}px`;
  style.maxHeight = `${Math.floor(room)}px`;

  if (height > room) {
    style.overflowY = "auto";
  }
};

const fitLifted = (
  panel: HTMLElement,
  anchor: HTMLElement,
  plan: LiftPlan
): void => {
  const { style } = panel;
  style.maxHeight = "";
  style.maxWidth = `${globalThis.innerWidth - EDGE * 2}px`;
  const rect = anchor.getBoundingClientRect();
  const width = panel.offsetWidth;
  const height = panel.scrollHeight;
  style.left = `${Math.round(toLeft(rect, plan, width))}px`;
  fitTop(style, rect, plan, height);
};

const liftPanel = (panel: HTMLElement, anchor: HTMLElement): LiftPlan => {
  const before = toLayoutBox(panel);
  const rect = anchor.getBoundingClientRect();

  const plan = {
    isAbove: before.top + panel.offsetHeight <= rect.top + 1,
    offsetX: before.left - rect.left,
  };

  showOnTop(panel);
  pinFixed(panel.style);
  fitLifted(panel, anchor, plan);

  return plan;
};

export { fitLifted, liftPanel, showOnTop };

export type { LiftPlan };
