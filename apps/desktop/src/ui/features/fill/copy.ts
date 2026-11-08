import type { BlendMode, FillType, RadialForm } from "./deps.js";

const copy = {
  addHint: "Click the bar to add a stop. Press Delete to remove one.",
  addLabel: "Add a gradient stop here",
  angle: "Angle",
  angleLabel: "Gradient angle",
  applied: "Fill saved.",
  apply: "Apply",
  applying: "Saving…",
  barLabel: "Gradient stops",
  blend: "Blend",
  blendLabel: "Blend mode",
  color: "Color",
  colorLabel: "Fill color",
  form: "Shape",
  formLabel: "Radial gradient shape",
  noSource: "Design Studio cannot find this layer in the code.",
  reset: "Reset",
  resetLabel: "Discard the fill draft",
  stopColor: "Stop",
  stopColorLabel: "Stop color",
  stopLabel: "Stop",
  title: "Fill",
  typeLabel: "Fill type",
} as const;

const TYPE_LABELS: Record<FillType, string> = {
  linear: "Linear",
  radial: "Radial",
  solid: "Solid",
};

const FORM_LABELS: Record<RadialForm, string> = {
  circle: "Circle",
  ellipse: "Ellipse",
};

const blendLabel = (mode: BlendMode): string =>
  mode
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const stopText = (index: number, position: number, color: string): string =>
  `${copy.stopLabel} ${index + 1}, ${position}%, ${color}`;

export { blendLabel, copy, FORM_LABELS, stopText, TYPE_LABELS };
