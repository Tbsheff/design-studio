import { GAP_MODES } from "./auto-layout-model.js";
import type { GapMode } from "./auto-layout-model.js";
import { dividerCopy } from "./copy.js";

type DividerAxis = "x" | "y";

type GapMenuMode = GapMode | "lines";

interface GapMenuOption {
  readonly label: string;
  readonly value: GapMenuMode;
}

interface Divider {
  readonly axis: DividerAxis;
  readonly color: string | null;
  readonly isReverse: boolean;
  readonly width: number;
}

interface WidthOption {
  readonly label: string;
  readonly value: string;
}

interface DividerPaint {
  readonly color: string | null;
  readonly token: string | null;
}

interface DividerClassSwap {
  readonly add: string[];
  readonly remove: string[];
}

const LINES: GapMenuMode = "lines";

const GAP_MENU: readonly GapMenuOption[] = [
  ...GAP_MODES,
  { label: dividerCopy.linesBetween, value: LINES },
];

const WIDTHS: readonly WidthOption[] = [
  { label: "1 px", value: "1" },
  { label: "2 px", value: "2" },
  { label: "4 px", value: "4" },
  { label: "8 px", value: "8" },
];

const AXIS_CLASS = /^divide-(?<axis>[xy])(?:-(?<width>\d+))?$/u;

const REVERSE_CLASS = /^divide-[xy]-reverse$/u;

const STYLE_WORDS = new Set([
  "dashed",
  "dotted",
  "double",
  "hidden",
  "none",
  "solid",
]);

const RAW_COLOR = /^(?:#|rgb|hsl|oklch|oklab|lab|lch|color\()/u;

const isBaseClass = (token: string): boolean => !token.includes(":");

const isColorClass = (token: string): boolean => {
  if (!token.startsWith("divide-")) {
    return false;
  }

  const rest = token.slice("divide-".length);

  return (
    !AXIS_CLASS.test(token) &&
    !REVERSE_CLASS.test(token) &&
    !STYLE_WORDS.has(rest) &&
    !rest.startsWith("opacity-")
  );
};

const toColorOf = (token: string): string => {
  const rest = token.slice("divide-".length);

  if (rest.startsWith("[") && rest.endsWith("]")) {
    return rest.slice(1, -1).replaceAll("_", " ");
  }

  return rest;
};

const toColorOrNull = (token: string | null): string | null => {
  if (token === null) {
    return null;
  }

  return toColorOf(token);
};

interface AxisHit {
  readonly axis: DividerAxis;
  readonly width: number;
}

const toAxisHit = (token: string): AxisHit[] => {
  const groups = AXIS_CLASS.exec(token)?.groups ?? null;

  if (groups === null) {
    return [];
  }

  const width = Number(groups.width ?? "1");

  if (width <= 0) {
    return [];
  }

  if (groups.axis === "x") {
    return [{ axis: "x", width }];
  }

  return [{ axis: "y", width }];
};

const toDivider = (classes: readonly string[] | null): Divider | null => {
  const base = (classes ?? []).filter((token) => isBaseClass(token));
  const hits = base.flatMap((token) => toAxisHit(token));
  const hit = hits.find((entry) => entry.axis === "y") ?? hits[0] ?? null;

  if (hit === null) {
    return null;
  }

  const color = base.find((token) => isColorClass(token)) ?? null;

  return {
    ...hit,
    color: toColorOrNull(color),
    isReverse: base.some((token) => REVERSE_CLASS.test(token)),
  };
};

const toAxisFor = (flexDirection: string): DividerAxis => {
  if (flexDirection.startsWith("row")) {
    return "x";
  }

  return "y";
};

const toGapMenuMode = (mode: GapMode, divider: Divider | null): GapMenuMode => {
  if (divider !== null) {
    return LINES;
  }

  return mode;
};

const toDividerPaint = (text: string): DividerPaint | null => {
  const value = text.trim();

  if (value === "") {
    return null;
  }

  if (RAW_COLOR.test(value)) {
    return { color: value, token: null };
  }

  return { color: null, token: value };
};

const toAxisClass = (axis: DividerAxis, width: number): string => {
  if (width === 1) {
    return `divide-${axis}`;
  }

  return `divide-${axis}-${width}`;
};

const toAxisSwap = (
  divider: Divider | null,
  next: DividerAxis
): DividerClassSwap | null => {
  if (divider === null || divider.axis === next || divider.isReverse) {
    return null;
  }

  return {
    add: [toAxisClass(next, divider.width)],
    remove: [toAxisClass(divider.axis, divider.width)],
  };
};

const TWO_PX = 2;

const FOUR_PX = 4;

const EIGHT_PX = 8;

const DIVIDER_WIDTHS = [1, TWO_PX, FOUR_PX, EIGHT_PX] as const;

type DividerWidth = (typeof DIVIDER_WIDTHS)[number];

const toDividerWidth = (width: number): DividerWidth =>
  DIVIDER_WIDTHS.find((entry) => entry === width) ?? 1;

const toSwatchColor = (divider: Divider): string => {
  if (divider.color === null) {
    return "currentColor";
  }

  if (RAW_COLOR.test(divider.color)) {
    return divider.color;
  }

  return `var(--color-${divider.color})`;
};

export {
  GAP_MENU,
  LINES,
  WIDTHS,
  toAxisFor,
  toAxisSwap,
  toDivider,
  toDividerPaint,
  toDividerWidth,
  toGapMenuMode,
  toSwatchColor,
};

export type { Divider, DividerAxis, DividerPaint, GapMenuMode };
