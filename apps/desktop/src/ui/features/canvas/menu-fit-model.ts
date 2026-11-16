type MenuSide = "left" | "right";

interface MenuBox {
  readonly bottom: number;
  readonly left: number;
  readonly right: number;
  readonly top: number;
}

interface MenuSize {
  readonly height: number;
  readonly width: number;
}

interface MenuFitInput {
  readonly anchor: MenuBox;
  readonly bounds: MenuBox;
  readonly gap: number | null;
  readonly size: MenuSize;
  readonly top: number;
}

interface MenuFit {
  readonly shiftX: number;
  readonly shiftY: number;
  readonly side: MenuSide;
}

const MENU_MARGIN = 8;

const toShift = (
  start: number,
  length: number,
  low: number,
  high: number
): number => {
  const end = start + length;

  if (start < low + MENU_MARGIN) {
    return low + MENU_MARGIN - start;
  }

  if (end > high - MENU_MARGIN) {
    return Math.max(high - MENU_MARGIN - end, low + MENU_MARGIN - start);
  }

  return 0;
};

const toShiftX = (left: number, input: MenuFitInput): number =>
  toShift(left, input.size.width, input.bounds.left, input.bounds.right);

const toRootFit = (input: MenuFitInput): MenuFit => ({
  shiftX: toShiftX(input.anchor.left, input),
  shiftY: toShift(
    input.top,
    input.size.height,
    input.bounds.top,
    input.bounds.bottom
  ),
  side: "right",
});

const toSide = (input: MenuFitInput, gap: number): MenuSide => {
  const { anchor, bounds, size } = input;
  const right = anchor.right + gap + size.width;
  const left = anchor.left - gap - size.width;

  if (right <= bounds.right - MENU_MARGIN) {
    return "right";
  }

  if (left >= bounds.left + MENU_MARGIN) {
    return "left";
  }

  if (bounds.right - anchor.right >= anchor.left - bounds.left) {
    return "right";
  }

  return "left";
};

const toSubmenuFit = (input: MenuFitInput, gap: number): MenuFit => {
  const side = toSide(input, gap);
  let left = input.anchor.right + gap;

  if (side === "left") {
    left = input.anchor.left - gap - input.size.width;
  }

  return {
    shiftX: toShiftX(left, input),
    shiftY: toShift(
      input.top,
      input.size.height,
      input.bounds.top,
      input.bounds.bottom
    ),
    side,
  };
};

const toMenuFit = (input: MenuFitInput): MenuFit => {
  if (input.gap === null) {
    return toRootFit(input);
  }

  return toSubmenuFit(input, input.gap);
};

const toVisibleBounds = (stage: MenuBox | null, view: MenuSize): MenuBox => {
  const window: MenuBox = {
    bottom: view.height,
    left: 0,
    right: view.width,
    top: 0,
  };

  if (stage === null) {
    return window;
  }

  return {
    bottom: Math.min(stage.bottom, window.bottom),
    left: Math.max(stage.left, window.left),
    right: Math.min(stage.right, window.right),
    top: Math.max(stage.top, window.top),
  };
};

export { MENU_MARGIN, toMenuFit, toVisibleBounds };

export type { MenuBox, MenuFit, MenuFitInput, MenuSide, MenuSize };
