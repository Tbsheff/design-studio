import { BOX_SIDES } from "./deps.js";
import type {
  BoxSide,
  SelectionContext,
  SpacingSide,
  SpacingStep,
} from "./deps.js";

type Rect = SelectionContext["rect"];

type BandKind = "gap" | "margin" | "padding";

type Slot =
  | "column-gap"
  | `margin-${BoxSide}`
  | `padding-${BoxSide}`
  | "row-gap";

type SpacingValues = Readonly<Record<Slot, number>>;

type DragMode = "all" | "axis" | "one";

type StyleMap = Readonly<Record<string, string>>;

type CommittedStyle = Readonly<Partial<Record<BandKind, string>>>;

interface Band {
  readonly id: string;
  readonly kind: BandKind;
  readonly rect: Rect;
  readonly slot: Slot;
}

interface SnapResult {
  readonly px: number;
  readonly token: string | null;
}

interface DragPlan {
  readonly property: BandKind;
  readonly side: SpacingSide;
  readonly slots: readonly Slot[];
}

const ROW_GAP = "row-gap";
const COLUMN_GAP = "column-gap";
const GAP_SLOTS: readonly Slot[] = [ROW_GAP, COLUMN_GAP];
const AXIS_Y: ReadonlySet<BoxSide> = new Set(["top", "bottom"]);
const LAYOUTS = new Set(["flex", "inline-flex", "grid", "inline-grid"]);

const pxOf = (text: string | null): number => {
  const value = Number((text ?? "0").replace(/px$/u, ""));

  if (Number.isFinite(value)) {
    return Math.round(value);
  }

  return 0;
};

const partsOf = (text: string | null): string[] =>
  (text ?? "").trim().split(/\s+/u).filter(Boolean);

const boxOf = (text: string | null): Record<BoxSide, number> => {
  const [top = "", right = top, bottom = top, left = right] = partsOf(text);

  return {
    bottom: pxOf(bottom),
    left: pxOf(left),
    right: pxOf(right),
    top: pxOf(top),
  };
};

const sideValue = (
  styles: Record<string, string>,
  group: "margin" | "padding",
  side: BoxSide
): number => {
  const own = styles[`${group}-${side}`] ?? null;

  if (own !== null) {
    return pxOf(own);
  }

  return boxOf(styles[group] ?? null)[side];
};

const gapValue = (
  styles: Record<string, string>,
  slot: typeof COLUMN_GAP | typeof ROW_GAP
): number => {
  const own = styles[slot] ?? null;

  if (own !== null) {
    return pxOf(own);
  }

  const [row = "", column = row] = partsOf(styles.gap ?? null);

  if (slot === ROW_GAP) {
    return pxOf(row);
  }

  return pxOf(column);
};

const valuesOf = (styles: Record<string, string>): SpacingValues => {
  const entries = BOX_SIDES.flatMap((side): [Slot, number][] => [
    [`padding-${side}`, sideValue(styles, "padding", side)],
    [`margin-${side}`, sideValue(styles, "margin", side)],
  ]);

  return Object.fromEntries([
    ...entries,
    [ROW_GAP, gapValue(styles, ROW_GAP)],
    [COLUMN_GAP, gapValue(styles, COLUMN_GAP)],
  ]) as SpacingValues;
};

const isLayout = (styles: Record<string, string>): boolean =>
  LAYOUTS.has(styles.display ?? "");

const kindOf = (slot: Slot): BandKind => {
  if (slot.startsWith("padding")) {
    return "padding";
  }

  if (slot.startsWith("margin")) {
    return "margin";
  }

  return "gap";
};

const sideOf = (slot: Slot): BoxSide => {
  const [, side] = slot.split("-");

  return BOX_SIDES.find((item) => item === side) ?? "top";
};

const SIGNS: Readonly<Record<Slot, readonly [number, number]>> = {
  "column-gap": [1, 0],
  "margin-bottom": [0, 1],
  "margin-left": [-1, 0],
  "margin-right": [1, 0],
  "margin-top": [0, -1],
  "padding-bottom": [0, -1],
  "padding-left": [1, 0],
  "padding-right": [-1, 0],
  "padding-top": [0, 1],
  "row-gap": [0, 1],
};

const dragValue = (
  slot: Slot,
  base: number,
  dx: number,
  dy: number
): number => {
  const [signX, signY] = SIGNS[slot];
  const next = Math.round(base + signX * dx + signY * dy);

  if (kindOf(slot) === "margin") {
    return next;
  }

  return Math.max(0, next);
};

const nearestStep = (
  scale: readonly SpacingStep[],
  px: number
): SpacingStep | null => {
  let best: SpacingStep | null = null;

  for (const step of scale) {
    if (!best || Math.abs(step.px - px) < Math.abs(best.px - px)) {
      best = step;
    }
  }

  return best;
};

const snapValue = (
  scale: readonly SpacingStep[],
  px: number,
  off: boolean
): SnapResult => {
  const step = nearestStep(scale, px);

  if (off || px < 0 || !step) {
    return { px, token: null };
  }

  return { px: step.px, token: step.token };
};

const modeOf = (event: { altKey: boolean; shiftKey: boolean }): DragMode => {
  if (event.shiftKey) {
    return "all";
  }

  if (event.altKey) {
    return "axis";
  }

  return "one";
};

const planFor = (
  property: BandKind,
  side: SpacingSide,
  slots: readonly Slot[]
): DragPlan => ({ property, side, slots });

const gapPlan = (slot: Slot, mode: DragMode): DragPlan => {
  if (mode === "all") {
    return planFor("gap", "all", GAP_SLOTS);
  }

  if (slot === ROW_GAP) {
    return planFor("gap", "y", [ROW_GAP]);
  }

  return planFor("gap", "x", [COLUMN_GAP]);
};

const boxSlots = (
  group: "margin" | "padding",
  sides: readonly BoxSide[]
): Slot[] => sides.map((side): Slot => `${group}-${side}`);

const boxPlan = (
  group: "margin" | "padding",
  side: BoxSide,
  mode: DragMode
): DragPlan => {
  if (mode === "all") {
    return planFor(group, "all", boxSlots(group, BOX_SIDES));
  }

  if (mode === "one") {
    return planFor(group, side, boxSlots(group, [side]));
  }

  if (AXIS_Y.has(side)) {
    return planFor(group, "y", boxSlots(group, ["top", "bottom"]));
  }

  return planFor(group, "x", boxSlots(group, ["left", "right"]));
};

const planOf = (slot: Slot, mode: DragMode): DragPlan => {
  const kind = kindOf(slot);

  if (kind === "gap") {
    return gapPlan(slot, mode);
  }

  return boxPlan(kind, sideOf(slot), mode);
};

const withSlots = (
  values: SpacingValues,
  slots: readonly Slot[],
  px: number
): SpacingValues => ({
  ...values,
  ...Object.fromEntries(slots.map((slot) => [slot, px])),
});

const styleOf = (slots: readonly Slot[], px: number): StyleMap =>
  Object.fromEntries(slots.map((slot) => [slot, `${px}px`]));

const baseStyleOf = (slots: readonly Slot[], values: SpacingValues): StyleMap =>
  Object.fromEntries(slots.map((slot) => [slot, `${values[slot]}px`]));

const shorthandOf = (
  values: SpacingValues,
  group: "margin" | "padding"
): string =>
  BOX_SIDES.map((side) => {
    const slot: Slot = `${group}-${side}`;

    return `${values[slot]}px`;
  }).join(" ");

const committedStyle = (
  values: SpacingValues,
  property: BandKind
): CommittedStyle => {
  if (property === "gap") {
    return { gap: `${values["row-gap"]}px ${values["column-gap"]}px` };
  }

  return { [property]: shorthandOf(values, property) };
};

const labelOf = (px: number, token: string | null): string => {
  if (token === null) {
    return String(px);
  }

  return `${px} · ${token}`;
};

const isSameRect = (one: Rect, two: Rect): boolean =>
  one.x === two.x &&
  one.y === two.y &&
  one.width === two.width &&
  one.height === two.height;

const mergeRects = (lists: readonly (readonly Rect[])[]): Rect[] => {
  const out: Rect[] = [];

  for (const rect of lists.flat()) {
    if (!out.some((item) => isSameRect(item, rect))) {
      out.push(rect);
    }
  }

  return out;
};

export {
  kindOf,
  baseStyleOf,
  committedStyle,
  dragValue,
  isLayout,
  labelOf,
  mergeRects,
  modeOf,
  planOf,
  snapValue,
  styleOf,
  valuesOf,
  withSlots,
};

export type {
  Band,
  BandKind,
  CommittedStyle,
  DragMode,
  DragPlan,
  Rect,
  Slot,
  SnapResult,
  SpacingValues,
  StyleMap,
};
