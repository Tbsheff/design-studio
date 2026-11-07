import type { StyleValues } from "./css-values.js";

export type Axis = "width" | "height";

export type SizeMode = "hug" | "fill" | "fixed";

export type AxisRole = "main" | "cross" | "none";

export interface ParentLayout {
  readonly flex: boolean;
  readonly grid: boolean;
  readonly row: boolean;
}

export const SIZE_MODES: {
  readonly value: SizeMode;
  readonly label: string;
}[] = [
  { label: "Fixed", value: "fixed" },
  { label: "Hug", value: "hug" },
  { label: "Fill", value: "fill" },
];

const HUG_VALUES = new Set(["fit-content", "max-content", "min-content"]);

export const isFlexDisplay = (display: string): boolean =>
  display === "flex" || display === "inline-flex";

export const isGridDisplay = (display: string): boolean =>
  display === "grid" || display === "inline-grid";

export const parentLayout = (styles: Record<string, string>): ParentLayout => {
  const display = (styles["parent-display"] ?? "").trim();
  const direction = (styles["parent-flex-direction"] ?? "").trim();

  return {
    flex: isFlexDisplay(display),
    grid: display === "grid" || display === "inline-grid",
    row: !direction.startsWith("column"),
  };
};

export const axisRole = (axis: Axis, parent: ParentLayout): AxisRole => {
  if (!parent.flex) {
    return "none";
  }

  return (axis === "width") === parent.row ? "main" : "cross";
};

export const flexGrow = (flex: string): number => {
  const first = flex.trim().split(/\s+/u)[0] ?? "";

  if (first === "auto") {
    return 1;
  }

  const grow = Number(first);

  return Number.isFinite(grow) ? grow : 0;
};

type Values = Pick<StyleValues, Axis | "flex" | "align-self">;

export interface SizeFacts {
  readonly authored: Record<Axis, string>;
  readonly display: string;
  readonly parentAlignItems: string;
  readonly parentJustifyItems: string;
  readonly justifySelf: string;
}

const BLOCK_DISPLAYS = new Set([
  "block",
  "flex",
  "grid",
  "table",
  "list-item",
  "flow-root",
]);

export const sizeFacts = (styles: Record<string, string>): SizeFacts => ({
  authored: {
    height: (styles["authored-height"] ?? "").trim(),
    width: (styles["authored-width"] ?? "").trim(),
  },
  display: (styles.display ?? "").trim(),
  justifySelf: (styles["own-justify-self"] ?? "").trim(),
  parentAlignItems: (styles["parent-align-items"] ?? "").trim(),
  parentJustifyItems: (styles["parent-justify-items"] ?? "").trim(),
});

const stretchesByDefault = (values: Values, facts: SizeFacts): boolean => {
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

const gridStretches = (
  axis: Axis,
  values: Values,
  facts: SizeFacts
): boolean => {
  const self =
    axis === "width" ? facts.justifySelf : values["align-self"].trim();

  if (self === "stretch") {
    return true;
  }

  if (!STRETCHY.has(self)) {
    return false;
  }

  return STRETCHY.has(
    axis === "width" ? facts.parentJustifyItems : facts.parentAlignItems
  );
};

const naturalMode = (
  axis: Axis,
  values: Values,
  parent: ParentLayout,
  facts: SizeFacts
): SizeMode => {
  const role = axisRole(axis, parent);

  if (role === "main") {
    return flexGrow(values.flex) > 0 ? "fill" : "hug";
  }

  if (role === "cross") {
    return stretchesByDefault(values, facts) ? "fill" : "hug";
  }

  if (parent.grid) {
    return gridStretches(axis, values, facts) ? "fill" : "hug";
  }

  return axis === "width" && BLOCK_DISPLAYS.has(facts.display) ? "fill" : "hug";
};

const authoredMode = (size: string): SizeMode | null => {
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

export const sizeModeOf = (
  axis: Axis,
  values: Values,
  parent: ParentLayout,
  facts?: SizeFacts
): SizeMode => {
  const role = axisRole(axis, parent);

  if (role === "main" && flexGrow(values.flex) > 0) {
    return "fill";
  }

  if (!facts) {
    if (role === "cross" && values["align-self"] === "stretch") {
      return "fill";
    }

    return authoredMode(values[axis].trim()) ?? "fixed";
  }

  return (
    authoredMode(facts.authored[axis]) ??
    naturalMode(axis, values, parent, facts)
  );
};

const clearing = (
  axis: Axis,
  values: Values,
  parent: ParentLayout
): Partial<StyleValues> => {
  const role = axisRole(axis, parent);

  return {
    ...(role === "main" && flexGrow(values.flex) > 0 ? { flex: "" } : {}),
    ...(role === "cross" && values["align-self"] === "stretch"
      ? { "align-self": "" }
      : {}),
  };
};

const fillPatch = (
  axis: Axis,
  values: Values,
  parent: ParentLayout,
  facts: SizeFacts
): Partial<StyleValues> => {
  const role = axisRole(axis, parent);
  const size = facts.authored[axis] ? { [axis]: "" } : {};

  if (role === "main") {
    return { flex: "1", ...size };
  }

  if (role === "cross") {
    return stretchesByDefault(values, facts)
      ? { [axis]: "" }
      : { "align-self": "stretch", [axis]: "" };
  }

  return { [axis]: "100%" };
};

export const sizePatch = (
  axis: Axis,
  mode: SizeMode,
  values: Values,
  parent: ParentLayout,
  usedPx: string,
  facts?: SizeFacts
): Partial<StyleValues> => {
  const clear = clearing(axis, values, parent);

  if (mode === "fixed") {
    return { [axis]: usedPx, ...clear };
  }

  if (!facts) {
    return legacyPatch(axis, mode, values, parent, clear);
  }

  if (mode === "fill") {
    return fillPatch(axis, values, parent, facts);
  }

  const natural = naturalMode(
    axis,
    {
      ...values,
      "align-self":
        values["align-self"] === "stretch" ? "" : values["align-self"],
      flex: "",
    },
    parent,
    facts
  );

  const ruleSize = facts.authored[axis];

  const sizedByRule =
    ruleSize !== "" &&
    ruleSize !== values[axis].trim() &&
    authoredMode(ruleSize) !== "hug" &&
    authoredMode(ruleSize) !== null;

  return {
    [axis]: natural === "hug" && !sizedByRule ? "" : "fit-content",
    ...clear,
  };
};

const legacyPatch = (
  axis: Axis,
  mode: SizeMode,
  values: Values,
  parent: ParentLayout,
  clear: Partial<StyleValues>
): Partial<StyleValues> => {
  const role = axisRole(axis, parent);

  const authoredSize =
    HUG_VALUES.has(values[axis].trim()) || values[axis].trim() === "100%";

  if (mode === "hug") {
    return { [axis]: "fit-content", ...clear };
  }

  if (role === "main") {
    return { flex: "1", ...(authoredSize ? { [axis]: "" } : {}) };
  }

  if (role === "cross") {
    return { "align-self": "stretch", [axis]: "" };
  }

  return { [axis]: "100%" };
};

export interface AlignCell {
  readonly justify: string;
  readonly align: string;
}

const AXIS_VALUES = ["flex-start", "center", "flex-end"] as const;

export const alignSlot = (value: string): number | null => {
  const v = value.trim();

  if (
    v === "flex-start" ||
    v === "start" ||
    v === "left" ||
    v === "normal" ||
    v === "self-start"
  ) {
    return 0;
  }

  if (v === "center") {
    return 1;
  }

  if (v === "flex-end" || v === "end" || v === "right" || v === "self-end") {
    return 2;
  }

  return null;
};

export const alignCell = (
  col: number,
  row: number,
  isRow: boolean
): AlignCell => {
  const across = AXIS_VALUES[col] ?? "flex-start";
  const down = AXIS_VALUES[row] ?? "flex-start";

  return isRow
    ? { align: down, justify: across }
    : { align: across, justify: down };
};

export const activeCell = (
  justify: string,
  align: string,
  isRow: boolean
): { readonly col: number; readonly row: number } | null => {
  const j = alignSlot(justify);

  const a =
    align.trim() === "normal" || align.trim() === "stretch"
      ? null
      : alignSlot(align);

  if (j === null || a === null) {
    return null;
  }

  return isRow ? { col: j, row: a } : { col: a, row: j };
};
