import type { StyleValues } from "./css-value-model.js";

type Axis = "width" | "height";

type SizeMode = "hug" | "fill" | "fixed";

type AxisRole = "main" | "cross" | "none";

interface ParentLayout {
  readonly isFlex: boolean;
  readonly isGrid: boolean;
  readonly isRow: boolean;
}

const FLEX_START = "flex-start";
const FLEX_END = "flex-end";
const GRID = "grid";
const FIT_CONTENT = "fit-content";

const SIZE_MODES: {
  readonly value: SizeMode;
  readonly label: string;
}[] = [
  { label: "Fixed", value: "fixed" },
  { label: "Hug", value: "hug" },
  { label: "Fill", value: "fill" },
];

const HUG_VALUES = new Set([FIT_CONTENT, "max-content", "min-content"]);

const isFlexDisplay = (display: string): boolean =>
  display === "flex" || display === "inline-flex";

const isGridDisplay = (display: string): boolean =>
  display === GRID || display === "inline-grid";

const toParentLayout = (styles: Record<string, string>): ParentLayout => {
  const display = (styles["parent-display"] ?? "").trim();
  const direction = (styles["parent-flex-direction"] ?? "").trim();

  return {
    isFlex: isFlexDisplay(display),
    isGrid: isGridDisplay(display),
    isRow: !direction.startsWith("column"),
  };
};

const toAxisRole = (axis: Axis, parent: ParentLayout): AxisRole => {
  if (!parent.isFlex) {
    return "none";
  }

  if ((axis === "width") === parent.isRow) {
    return "main";
  }

  return "cross";
};

const toFlexGrow = (flex: string): number => {
  const first = flex.trim().split(/\s+/u)[0] ?? "";

  if (first === "auto") {
    return 1;
  }

  const grow = Number(first);

  if (Number.isFinite(grow)) {
    return grow;
  }

  return 0;
};

type Values = Pick<StyleValues, Axis | "flex" | "align-self">;

interface SizeFacts {
  readonly authored: Record<Axis, string>;
  readonly display: string;
  readonly parentAlignItems: string;
  readonly parentJustifyItems: string;
  readonly justifySelf: string;
}

const BLOCK_DISPLAYS = new Set([
  "block",
  "flex",
  GRID,
  "table",
  "list-item",
  "flow-root",
]);

const toSizeFacts = (styles: Record<string, string>): SizeFacts => ({
  authored: {
    height: (styles["authored-height"] ?? "").trim(),
    width: (styles["authored-width"] ?? "").trim(),
  },
  display: (styles.display ?? "").trim(),
  justifySelf: (styles["own-justify-self"] ?? "").trim(),
  parentAlignItems: (styles["parent-align-items"] ?? "").trim(),
  parentJustifyItems: (styles["parent-justify-items"] ?? "").trim(),
});

const isStretchedByDefault = (values: Values, facts: SizeFacts): boolean => {
  const self = values["align-self"].trim();

  if (self === "stretch") {
    return true;
  }

  const inherits = self === "" || self === "auto" || self === "normal";

  return (
    inherits &&
    (facts.parentAlignItems === "" ||
      facts.parentAlignItems === "normal" ||
      facts.parentAlignItems === "stretch")
  );
};

const STRETCHY = new Set(["", "auto", "normal", "stretch", "legacy"]);

const isGridStretched = (
  axis: Axis,
  values: Values,
  facts: SizeFacts
): boolean => {
  const isWidth = axis === "width";
  let self = values["align-self"].trim();

  if (isWidth) {
    self = facts.justifySelf;
  }

  if (self === "stretch") {
    return true;
  }

  if (!STRETCHY.has(self)) {
    return false;
  }

  if (isWidth) {
    return STRETCHY.has(facts.parentJustifyItems);
  }

  return STRETCHY.has(facts.parentAlignItems);
};

const toFillOrHug = (isFill: boolean): SizeMode => {
  if (isFill) {
    return "fill";
  }

  return "hug";
};

const toNaturalMode = (
  axis: Axis,
  values: Values,
  parent: ParentLayout,
  facts: SizeFacts
): SizeMode => {
  const role = toAxisRole(axis, parent);

  if (role === "main") {
    return toFillOrHug(toFlexGrow(values.flex) > 0);
  }

  if (role === "cross") {
    return toFillOrHug(isStretchedByDefault(values, facts));
  }

  if (parent.isGrid) {
    return toFillOrHug(isGridStretched(axis, values, facts));
  }

  return toFillOrHug(axis === "width" && BLOCK_DISPLAYS.has(facts.display));
};

const toAuthoredMode = (size: string): SizeMode | null => {
  if (size === "" || size === "auto") {
    return null;
  }

  if (size === "100%") {
    return "fill";
  }

  if (HUG_VALUES.has(size)) {
    return "hug";
  }

  return "fixed";
};

const toSizeMode = (
  axis: Axis,
  values: Values,
  parent: ParentLayout,
  facts: SizeFacts | null
): SizeMode => {
  const role = toAxisRole(axis, parent);

  if (role === "main" && toFlexGrow(values.flex) > 0) {
    return "fill";
  }

  if (!facts) {
    if (role === "cross" && values["align-self"] === "stretch") {
      return "fill";
    }

    return toAuthoredMode(values[axis].trim()) ?? "fixed";
  }

  return (
    toAuthoredMode(facts.authored[axis]) ??
    toNaturalMode(axis, values, parent, facts)
  );
};

const toClearing = (
  axis: Axis,
  values: Values,
  parent: ParentLayout
): Partial<StyleValues> => {
  const role = toAxisRole(axis, parent);

  const patch: Partial<StyleValues> = {};

  if (role === "main" && toFlexGrow(values.flex) > 0) {
    patch.flex = "";
  }

  if (role === "cross" && values["align-self"] === "stretch") {
    patch["align-self"] = "";
  }

  return patch;
};

const toFillPatch = (
  axis: Axis,
  values: Values,
  parent: ParentLayout,
  facts: SizeFacts
): Partial<StyleValues> => {
  const role = toAxisRole(axis, parent);

  if (role === "main") {
    if (facts.authored[axis]) {
      return { [axis]: "", flex: "1" };
    }

    return { flex: "1" };
  }

  if (role === "cross") {
    if (isStretchedByDefault(values, facts)) {
      return { [axis]: "" };
    }

    return { "align-self": "stretch", [axis]: "" };
  }

  return { [axis]: "100%" };
};

const toNaturalSelf = (alignSelf: string): string => {
  if (alignSelf === "stretch") {
    return "";
  }

  return alignSelf;
};

interface SizeContext {
  readonly parent: ParentLayout;
  readonly usedPx: string;
  readonly values: Values;
}

const isAuthoredSize = (raw: string): boolean => {
  const size = raw.trim();

  return HUG_VALUES.has(size) || size === "100%";
};

const toLegacyMainPatch = (
  axis: Axis,
  isAuthored: boolean
): Partial<StyleValues> => {
  if (isAuthored) {
    return { [axis]: "", flex: "1" };
  }

  return { flex: "1" };
};

const toLegacyPatch = (
  axis: Axis,
  mode: SizeMode,
  context: SizeContext,
  clear: Partial<StyleValues>
): Partial<StyleValues> => {
  const { parent, values } = context;
  const role = toAxisRole(axis, parent);

  if (mode === "hug") {
    return { [axis]: FIT_CONTENT, ...clear };
  }

  if (role === "main") {
    return toLegacyMainPatch(axis, isAuthoredSize(values[axis]));
  }

  if (role === "cross") {
    return { "align-self": "stretch", [axis]: "" };
  }

  return { [axis]: "100%" };
};

const isRuleSized = (ruleSize: string, current: string): boolean => {
  const authored = toAuthoredMode(ruleSize);

  return (
    ruleSize !== "" &&
    ruleSize !== current.trim() &&
    authored !== "hug" &&
    authored !== null
  );
};

const toHugPatch = (
  axis: Axis,
  context: SizeContext,
  facts: SizeFacts,
  clear: Partial<StyleValues>
): Partial<StyleValues> => {
  const { parent, values } = context;
  const naturalSelf = toNaturalSelf(values["align-self"]);

  const natural = toNaturalMode(
    axis,
    { ...values, "align-self": naturalSelf, flex: "" },
    parent,
    facts
  );

  const isSizedByRule = isRuleSized(facts.authored[axis], values[axis]);

  if (natural === "hug" && !isSizedByRule) {
    return { [axis]: "", ...clear };
  }

  return { [axis]: FIT_CONTENT, ...clear };
};

const toSizePatch = (
  axis: Axis,
  mode: SizeMode,
  context: SizeContext,
  facts: SizeFacts | null
): Partial<StyleValues> => {
  const { parent, usedPx, values } = context;
  const clear = toClearing(axis, values, parent);

  if (mode === "fixed") {
    return { [axis]: usedPx, ...clear };
  }

  if (!facts) {
    return toLegacyPatch(axis, mode, context, clear);
  }

  if (mode === "fill") {
    return toFillPatch(axis, values, parent, facts);
  }

  return toHugPatch(axis, context, facts, clear);
};

interface AlignCell {
  readonly justify: string;
  readonly align: string;
}

const AXIS_VALUES = [FLEX_START, "center", FLEX_END] as const;

const START_VALUES = new Set([
  FLEX_START,
  "start",
  "left",
  "normal",
  "self-start",
]);

const END_VALUES = new Set([FLEX_END, "end", "right", "self-end"]);

const toAlignIndex = (value: string): number | null => {
  const trimmed = value.trim();

  if (START_VALUES.has(trimmed)) {
    return 0;
  }

  if (trimmed === "center") {
    return 1;
  }

  if (END_VALUES.has(trimmed)) {
    return 2;
  }

  return null;
};

const toAlignCell = (col: number, row: number, isRow: boolean): AlignCell => {
  const across = AXIS_VALUES[col] ?? FLEX_START;
  const down = AXIS_VALUES[row] ?? FLEX_START;

  if (isRow) {
    return { align: down, justify: across };
  }

  return { align: across, justify: down };
};

const toAlignSlot = (align: string): number | null => {
  if (align.trim() === "normal" || align.trim() === "stretch") {
    return null;
  }

  return toAlignIndex(align);
};

const toActiveCell = (
  justify: string,
  align: string,
  isRow: boolean
): { readonly col: number; readonly row: number } | null => {
  const offset = toAlignIndex(justify);

  const first = toAlignSlot(align);

  if (offset === null || first === null) {
    return null;
  }

  if (isRow) {
    return { col: offset, row: first };
  }

  return { col: first, row: offset };
};

export {
  SIZE_MODES,
  isFlexDisplay,
  isGridDisplay,
  toParentLayout,
  toAxisRole,
  toFlexGrow,
  toSizeFacts,
  toSizeMode,
  toSizePatch,
  toAlignIndex,
  toAlignCell,
  toActiveCell,
};

export type { Axis, SizeMode, AxisRole, ParentLayout, SizeFacts, AlignCell };
