type AlignAxis = "column" | "row";

type AlignSide = "center" | "end" | "start";

type AlignSeverity = "low" | "medium";

type AlignMarginProp =
  | "margin-bottom"
  | "margin-left"
  | "margin-right"
  | "margin-top";

interface AlignChild {
  readonly alignSelf: string;
  readonly height: number;
  readonly margin: readonly [number, number, number, number];
  readonly noun: string;
  readonly selector: string;
  readonly tag: string;
  readonly width: number;
  readonly x: number;
  readonly y: number;
}

interface AlignGroup {
  readonly alignItems: string;
  readonly children: readonly AlignChild[];
  readonly direction: string;
  readonly display: string;
  readonly selector: string;
  readonly tag: string;
}

interface AlignProbeResult {
  readonly groups: readonly AlignGroup[];
  readonly ms: number;
}

interface AlignFix {
  readonly label: string;
  readonly prop: AlignMarginProp;
  readonly selector: string;
  readonly value: string;
}

interface AlignHit {
  readonly fix: AlignFix | null;
  readonly hint: string;
  readonly key: string;
  readonly message: string;
  readonly selector: string;
  readonly severity: AlignSeverity;
}

interface AlignLine {
  readonly align: string;
  readonly axis: AlignAxis;
  readonly children: readonly AlignChild[];
  readonly group: AlignGroup;
  readonly isFlexOrGrid: boolean;
}

interface AlignMode {
  readonly count: number;
  readonly value: number;
}

interface EdgeOffset {
  readonly child: AlignChild;
  readonly offset: number;
  readonly others: number;
  readonly side: AlignSide;
}

const SAME = 0.5;
const NEAR_MIN = 0.75;
const EDGE_MAX = 3.25;
const GAP_MAX = 4.25;
const OVERLAP = 1;

const START_ALIGN = new Set(["flex-start", "self-start", "start"]);
const END_ALIGN = new Set(["end", "flex-end", "self-end"]);
const STRETCH_ALIGN = new Set(["normal", "stretch"]);

const isFlexOrGridDisplay = (display: string): boolean =>
  /flex|grid/u.test(display);

const toStart = (child: AlignChild, axis: AlignAxis): number => {
  if (axis === "column") {
    return child.y;
  }

  return child.x;
};

const toSize = (child: AlignChild, axis: AlignAxis): number => {
  if (axis === "column") {
    return child.height;
  }

  return child.width;
};

const isSequence = (
  children: readonly AlignChild[],
  axis: AlignAxis
): boolean =>
  children.slice(1).every((child, index) => {
    const before = children[index];

    if (!before) {
      return false;
    }

    return (
      toStart(child, axis) >=
      toStart(before, axis) + toSize(before, axis) - OVERLAP
    );
  });

const toBands = (children: readonly AlignChild[]): AlignChild[][] => {
  const bands: AlignChild[][] = [];
  let band: AlignChild[] = [];

  for (const child of children) {
    const before = band.at(-1);

    if (before && child.x < before.x + before.width - OVERLAP) {
      bands.push(band);
      band = [];
    }

    band.push(child);
  }

  bands.push(band);

  return bands.filter((each) => isSequence(each, "row"));
};

const toLines = (group: AlignGroup): AlignLine[] => {
  const isFlexOrGrid = isFlexOrGridDisplay(group.display);

  if (isSequence(group.children, "column")) {
    return [
      {
        align: group.alignItems,
        axis: "column",
        children: group.children,
        group,
        isFlexOrGrid,
      },
    ];
  }

  if (!isFlexOrGrid || group.direction.startsWith("column")) {
    return [];
  }

  return toBands(group.children).map((band): AlignLine => ({
    align: group.alignItems,
    axis: "row",
    children: band,
    group,
    isFlexOrGrid,
  }));
};

const toSides = (line: AlignLine): AlignSide[] => {
  if (!line.isFlexOrGrid) {
    if (line.axis === "column") {
      return ["start"];
    }

    return [];
  }

  if (line.group.display.includes("grid") && line.axis === "column") {
    return ["start", "end"];
  }

  if (line.align === "center") {
    return ["center"];
  }

  if (END_ALIGN.has(line.align)) {
    return ["end"];
  }

  if (START_ALIGN.has(line.align)) {
    return ["start"];
  }

  if (STRETCH_ALIGN.has(line.align)) {
    return ["start", "end"];
  }

  return [];
};

const toEdge = (
  child: AlignChild,
  axis: AlignAxis,
  side: AlignSide
): number => {
  let from = child.x;
  let size = child.width;

  if (axis === "row") {
    from = child.y;
    size = child.height;
  }

  if (side === "center") {
    return from + size / 2;
  }

  if (side === "end") {
    return from + size;
  }

  return from;
};

const toMode = (values: readonly number[]): AlignMode => {
  let best: AlignMode = { count: 0, value: 0 };

  for (const value of values) {
    const count = values.filter(
      (other) => Math.abs(other - value) <= SAME
    ).length;

    if (count > best.count) {
      best = { count, value };
    }
  }

  return best;
};

const isMajority = (mode: AlignMode, total: number): boolean =>
  mode.count >= 2 && mode.count * 2 > total;

const isNear = (offset: number, max: number): boolean =>
  Math.abs(offset) >= NEAR_MIN && Math.abs(offset) <= max;

const toMarginProp = (axis: AlignAxis, side: AlignSide): AlignMarginProp => {
  if (axis === "row" && side === "end") {
    return "margin-bottom";
  }

  if (axis === "row") {
    return "margin-top";
  }

  if (side === "end") {
    return "margin-right";
  }

  return "margin-left";
};

const MARGIN_INDEX: Readonly<Record<AlignMarginProp, number>> = {
  "margin-bottom": 2,
  "margin-left": 3,
  "margin-right": 1,
  "margin-top": 0,
};

const toMarginFix = (
  child: AlignChild,
  marginProp: AlignMarginProp,
  change: number
): AlignFix | null => {
  const own = child.margin[MARGIN_INDEX[marginProp]] ?? 0;
  const next = Math.round(own + change);

  if (own === 0 || next < 0 || Math.abs(own + change - next) > SAME) {
    return null;
  }

  return {
    label: `Set ${marginProp} to ${next}px`,
    prop: marginProp,
    selector: child.selector,
    value: `${next}px`,
  };
};

export {
  EDGE_MAX,
  GAP_MAX,
  SAME,
  isMajority,
  isNear,
  toEdge,
  toLines,
  toMarginFix,
  toMarginProp,
  toMode,
  toSides,
  toSize,
  toStart,
};

export type {
  AlignAxis,
  AlignChild,
  AlignFix,
  AlignGroup,
  AlignHit,
  AlignLine,
  AlignMarginProp,
  AlignProbeResult,
  AlignSide,
  EdgeOffset,
};
