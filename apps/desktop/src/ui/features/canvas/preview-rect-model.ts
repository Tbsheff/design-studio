import type {
  BridgeToParent,
  SelectionContext,
} from "@design-studio/contracts";

import { toPosition } from "./snap-model.js";

interface HoverBox {
  rect: SelectionContext["rect"];
  label?: string;
  altKey?: boolean;
  fromTree?: boolean;
  node?: number;
}

const pagePoint = (
  frame: HTMLIFrameElement | null,
  posX: number,
  posY: number
): ReturnType<typeof toPosition> | null => {
  if (!frame) {
    return null;
  }

  const rect = frame.getBoundingClientRect();

  let scale = 1;

  if (frame.offsetWidth > 0) {
    scale = rect.width / frame.offsetWidth;
  }

  return toPosition(rect.left + posX * scale, rect.top + posY * scale);
};

const sameRect = (
  first: SelectionContext["rect"],
  second: SelectionContext["rect"]
): boolean =>
  first.x === second.x &&
  first.y === second.y &&
  first.width === second.width &&
  first.height === second.height;

const applyRects = (
  prev: SelectionContext[],
  selectors: string[],
  rects: (SelectionContext["rect"] | null)[]
): SelectionContext[] => {
  let changed = false;

  const next = prev.map((selectionContext6) => {
    const index = selectors.indexOf(selectionContext6.selector);

    if (index === -1) {
      return selectionContext6;
    }

    const ratio = rects[index];

    if (!ratio || sameRect(ratio, selectionContext6.rect)) {
      return selectionContext6;
    }

    changed = true;

    return { ...selectionContext6, rect: ratio };
  });

  if (changed) {
    return next;
  }

  return prev;
};

const hoverOf = (
  msg: Extract<BridgeToParent, { type: "hover" }>
): HoverBox | null => {
  if (!msg.rect) {
    return null;
  }

  const box: HoverBox = {
    altKey: msg.altKey === true,
    fromTree: msg.source === "tree",
    label: msg.label,
    rect: msg.rect,
  };

  if (Number.isFinite(msg.node)) {
    box.node = msg.node;
  }

  return box;
};

export { applyRects, hoverOf, pagePoint };

export type { HoverBox };
