import type { LinkPlacement } from "@design-studio/contracts/link-interaction";

interface PopoverSlot {
  readonly isOutsideClose: boolean;
  readonly left: number;
  readonly scale: number;
  readonly top: number;
}

interface PopoverBox {
  readonly height: number;
  readonly left: number;
  readonly top: number;
  readonly width: number;
}

interface PopoverSize {
  readonly height: number;
  readonly width: number;
}

interface PopoverInput {
  readonly anchor: PopoverBox;
  readonly placement: LinkPlacement;
  readonly size: PopoverSize;
  readonly stage: PopoverSize;
}

interface PopoverSpot {
  readonly left: number;
  readonly top: number;
}

const POPOVER_GAP = 8;

const POPOVER_MARGIN = 8;

const FLIPPED: Readonly<Record<LinkPlacement, LinkPlacement>> = {
  "bottom-end": "top-end",
  "bottom-start": "top-start",
  left: "right",
  right: "left",
  "top-end": "bottom-end",
  "top-start": "bottom-start",
};

const SWAPPED: Readonly<Record<LinkPlacement, LinkPlacement>> = {
  "bottom-end": "bottom-start",
  "bottom-start": "bottom-end",
  left: "left",
  right: "right",
  "top-end": "top-start",
  "top-start": "top-end",
};

const isVerticalSide = (placement: LinkPlacement): boolean =>
  placement !== "left" && placement !== "right";

const isEndEdge = (placement: LinkPlacement): boolean =>
  placement.endsWith("-end");

const toPopoverSpot = (
  input: PopoverInput,
  placement: LinkPlacement
): PopoverSpot => {
  const { anchor, size } = input;
  const right = anchor.left + anchor.width;
  let edge = anchor.left;

  if (isEndEdge(placement)) {
    edge = right - size.width;
  }

  if (placement.startsWith("bottom")) {
    return { left: edge, top: anchor.top + anchor.height + POPOVER_GAP };
  }

  if (placement.startsWith("top")) {
    return { left: edge, top: anchor.top - size.height - POPOVER_GAP };
  }

  if (placement === "right") {
    return { left: right + POPOVER_GAP, top: anchor.top };
  }

  return { left: anchor.left - size.width - POPOVER_GAP, top: anchor.top };
};

const isSpanFit = (start: number, length: number, total: number): boolean =>
  start >= POPOVER_MARGIN && start + length <= total - POPOVER_MARGIN;

const isMainAxisFit = (
  input: PopoverInput,
  placement: LinkPlacement
): boolean => {
  const spot = toPopoverSpot(input, placement);
  const { size, stage } = input;

  if (isVerticalSide(placement)) {
    return isSpanFit(spot.top, size.height, stage.height);
  }

  return isSpanFit(spot.left, size.width, stage.width);
};

const isCrossAxisFit = (
  input: PopoverInput,
  placement: LinkPlacement
): boolean => {
  if (!isVerticalSide(placement)) {
    return true;
  }

  const spot = toPopoverSpot(input, placement);

  return isSpanFit(spot.left, input.size.width, input.stage.width);
};

const toRoomOnSide = (
  input: PopoverInput,
  placement: LinkPlacement
): number => {
  const { anchor, stage } = input;

  if (placement.startsWith("bottom")) {
    return stage.height - (anchor.top + anchor.height);
  }

  if (placement.startsWith("top")) {
    return anchor.top;
  }

  if (placement === "right") {
    return stage.width - (anchor.left + anchor.width);
  }

  return anchor.left;
};

const toMainPlacement = (
  input: PopoverInput,
  wanted: LinkPlacement
): LinkPlacement => {
  const opposite = FLIPPED[wanted];

  if (isMainAxisFit(input, wanted)) {
    return wanted;
  }

  if (isMainAxisFit(input, opposite)) {
    return opposite;
  }

  if (toRoomOnSide(input, opposite) > toRoomOnSide(input, wanted)) {
    return opposite;
  }

  return wanted;
};

const toCrossPlacement = (
  input: PopoverInput,
  placement: LinkPlacement
): LinkPlacement => {
  const swapped = SWAPPED[placement];

  if (!isCrossAxisFit(input, placement) && isCrossAxisFit(input, swapped)) {
    return swapped;
  }

  return placement;
};

const toClamped = (value: number, length: number, total: number): number =>
  Math.max(POPOVER_MARGIN, Math.min(value, total - length - POPOVER_MARGIN));

export {
  POPOVER_MARGIN,
  toClamped,
  toCrossPlacement,
  toMainPlacement,
  toPopoverSpot,
};

export type { PopoverBox, PopoverInput, PopoverSize, PopoverSlot, PopoverSpot };
