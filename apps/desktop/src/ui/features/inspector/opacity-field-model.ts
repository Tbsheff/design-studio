import { toNumberText, toParsedNumber } from "./css-value-model.js";
import type { StyleValues } from "./css-value-model.js";
import type { DirectEdit } from "./deps.js";

const PERCENT = 100;
const PERCENT_UNIT = "%";
const OPACITY_PROP = "opacity";

type Patch = Partial<StyleValues>;

type Bounds = Parameters<DirectEdit["shift"]>[2];

const toPercentText = (value: string): string => {
  const parsed = toParsedNumber(value);

  if (!parsed || parsed.unit !== "") {
    return value;
  }

  return toNumberText(parsed.value * PERCENT, PERCENT_UNIT);
};

const fromPercentText = (value: string): string => {
  const parsed = toParsedNumber(value);

  if (!parsed || (parsed.unit !== PERCENT_UNIT && parsed.unit !== "")) {
    return value;
  }

  return String(Math.round(parsed.value * PERCENT) / (PERCENT * PERCENT));
};

const fromPercentPatch = (patch: Patch): Patch => {
  const value = patch[OPACITY_PROP] ?? null;

  if (value === null) {
    return patch;
  }

  return { ...patch, [OPACITY_PROP]: fromPercentText(value) };
};

const toFractionBounds = (bounds: Bounds): Bounds => ({
  max: (bounds.max ?? Infinity) / PERCENT,
  min: (bounds.min ?? -Infinity) / PERCENT,
});

const toPercentEdit = (edit: DirectEdit): DirectEdit => ({
  ...edit,
  preview: (patch) => edit.preview(fromPercentPatch(patch)),
  previewForced: (patch) => edit.previewForced(fromPercentPatch(patch)),
  shift: (props, delta, bounds, part) =>
    edit.shift(props, delta / PERCENT, toFractionBounds(bounds), part),
  values: {
    ...edit.values,
    [OPACITY_PROP]: toPercentText(edit.values[OPACITY_PROP]),
  },
});

export { fromPercentText, toPercentEdit, toPercentText };
