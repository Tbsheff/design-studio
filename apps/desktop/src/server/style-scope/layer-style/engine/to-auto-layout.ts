type LayoutKind = "auto" | "row" | "column";

type LayoutDirection = "row" | "column";

interface LayoutBox {
  readonly height: number;
  readonly width: number;
  readonly x: number;
  readonly y: number;
}

interface LayoutChild {
  readonly box: LayoutBox;
  readonly isAbsolute: boolean;
  readonly key: string;
}

interface AutoLayoutPlan {
  readonly direction: LayoutDirection;
  readonly gap: number | null;
  readonly hasAbsolute: boolean;
  readonly order: readonly string[];
}

const TAILWIND_STEP = 4;

const HALF = 2;

const toCenter = (start: number, size: number): number => start + size / HALF;

const toSpread = (values: readonly number[]): number => {
  if (values.length === 0) {
    return 0;
  }

  return Math.max(...values) - Math.min(...values);
};

const toAutoDirection = (children: readonly LayoutChild[]): LayoutDirection => {
  const spreadX = toSpread(
    children.map((child) => toCenter(child.box.x, child.box.width))
  );

  const spreadY = toSpread(
    children.map((child) => toCenter(child.box.y, child.box.height))
  );

  if (spreadX > spreadY) {
    return "row";
  }

  return "column";
};

const toDirection = (
  children: readonly LayoutChild[],
  layout: LayoutKind
): LayoutDirection => {
  if (layout === "auto") {
    return toAutoDirection(children);
  }

  return layout;
};

const toStart = (box: LayoutBox, direction: LayoutDirection): number => {
  if (direction === "row") {
    return box.x;
  }

  return box.y;
};

const toCross = (box: LayoutBox, direction: LayoutDirection): number => {
  if (direction === "row") {
    return box.y;
  }

  return box.x;
};

const toEnd = (box: LayoutBox, direction: LayoutDirection): number => {
  if (direction === "row") {
    return box.x + box.width;
  }

  return box.y + box.height;
};

const toSortedChildren = (
  children: readonly LayoutChild[],
  direction: LayoutDirection
): LayoutChild[] =>
  children.toSorted(
    (first, second) =>
      toStart(first.box, direction) - toStart(second.box, direction) ||
      toCross(first.box, direction) - toCross(second.box, direction)
  );

const toMedian = (values: readonly number[]): number | null => {
  const sorted = values.toSorted((first, second) => first - second);
  const middle = Math.floor(sorted.length / HALF);

  if (sorted.length === 0) {
    return null;
  }

  if (sorted.length % HALF === 1) {
    return sorted[middle] ?? null;
  }

  return ((sorted[middle - 1] ?? 0) + (sorted[middle] ?? 0)) / HALF;
};

const toSnappedGap = (gap: number, isTailwind: boolean): number => {
  if (isTailwind) {
    return Math.round(gap / TAILWIND_STEP) * TAILWIND_STEP;
  }

  return Math.round(gap);
};

const toMedianGap = (
  sorted: readonly LayoutChild[],
  direction: LayoutDirection,
  isTailwind: boolean
): number | null => {
  const spaces = sorted.slice(1).map((child, index) => {
    const previous = sorted[index]?.box ?? child.box;

    return Math.max(
      0,
      toStart(child.box, direction) - toEnd(previous, direction)
    );
  });

  const median = toMedian(spaces);

  if (median === null) {
    return null;
  }

  return toSnappedGap(median, isTailwind);
};

const toAutoLayout = (
  children: readonly LayoutChild[],
  layout: LayoutKind,
  isTailwind: boolean
): AutoLayoutPlan => {
  const direction = toDirection(children, layout);
  const hasAbsolute = children.some((child) => child.isAbsolute);

  const isAllAbsolute =
    children.length > 1 && children.every((child) => child.isAbsolute);

  let ordered: readonly LayoutChild[] = children;
  let gap: number | null = null;

  if (isAllAbsolute) {
    ordered = toSortedChildren(children, direction);
    gap = toMedianGap(ordered, direction, isTailwind);
  }

  const order = ordered.map((child) => child.key);

  return { direction, gap, hasAbsolute, order };
};

export { toAutoLayout };

export type {
  AutoLayoutPlan,
  LayoutBox,
  LayoutChild,
  LayoutDirection,
  LayoutKind,
};
