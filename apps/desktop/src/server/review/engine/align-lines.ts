type AlignAxis = "column" | "row";

type AlignSide = "center" | "end" | "start";

type AlignRole = "column" | "line" | "rows";

type AlignSeverity = "low" | "medium";

type AlignMarginProp =
  | "margin-bottom"
  | "margin-left"
  | "margin-right"
  | "margin-top";

interface AlignChild {
  readonly alignSelf: string;
  readonly display: string;
  readonly height: number;
  readonly margin: readonly [number, number, number, number];
  readonly noun: string;
  readonly selector: string;
  readonly tag: string;
  readonly verticalAlign: string;
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
  readonly role: AlignRole;
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

const INLINE_BOX = new Set(["inline-block", "inline-flex"]);

const isInlineBox = (child: AlignChild): boolean =>
  INLINE_BOX.has(child.display);

const toLine = (
  group: AlignGroup,
  axis: AlignAxis,
  children: readonly AlignChild[],
  role: AlignRole
): AlignLine => {
  const align = group.alignItems;
  const isFlexOrGrid = isFlexOrGridDisplay(group.display);

  return { align, axis, children, group, isFlexOrGrid, role };
};

const toBandBox = (band: readonly AlignChild[]): AlignChild | null => {
  const [first] = band;

  if (!first) {
    return null;
  }

  const top = Math.min(...band.map((child) => child.y));
  const bottom = Math.max(...band.map((child) => child.y + child.height));
  const left = Math.min(...band.map((child) => child.x));
  const right = Math.max(...band.map((child) => child.x + child.width));

  return {
    alignSelf: first.alignSelf,
    display: first.display,
    height: bottom - top,
    margin: [0, 0, 0, 0],
    noun: first.noun,
    selector: first.selector,
    tag: first.tag,
    verticalAlign: first.verticalAlign,
    width: right - left,
    x: left,
    y: top,
  };
};

const toCrossLines = (
  group: AlignGroup,
  bands: readonly (readonly AlignChild[])[]
): AlignLine[] => {
  const count = bands[0]?.length ?? 0;

  if (bands.length < 2 || bands.some((band) => band.length !== count)) {
    return [];
  }

  const columns = Array.from({ length: count }, (_slot, index) =>
    toLine(
      group,
      "column",
      bands.flatMap((band) => band.slice(index, index + 1)),
      "column"
    )
  );

  const boxes = bands.flatMap((band) => toBandBox(band) ?? []);

  return [...columns, toLine(group, "column", boxes, "rows")];
};

const toLines = (group: AlignGroup): AlignLine[] => {
  const isFlexOrGrid = isFlexOrGridDisplay(group.display);

  if (isSequence(group.children, "column")) {
    return [toLine(group, "column", group.children, "line")];
  }

  const isInlineRow = !isFlexOrGrid && group.children.every(isInlineBox);

  if (!isInlineRow && (!isFlexOrGrid || group.direction.startsWith("column"))) {
    return [];
  }

  const bands = toBands(group.children);
  const rows = bands.map((band) => toLine(group, "row", band, "line"));

  if (!isFlexOrGrid) {
    return rows;
  }

  return [...rows, ...toCrossLines(group, bands)];
};

const toBlockSides = (line: AlignLine): AlignSide[] => {
  if (line.axis === "column") {
    return ["start"];
  }

  if (line.children.every((child) => child.verticalAlign === "bottom")) {
    return ["end"];
  }

  return ["start"];
};

const toSides = (line: AlignLine): AlignSide[] => {
  if (line.role === "rows") {
    return [];
  }

  if (line.role === "column") {
    return ["start"];
  }

  if (!line.isFlexOrGrid) {
    return toBlockSides(line);
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
  AlignRole,
  AlignSide,
  EdgeOffset,
};
