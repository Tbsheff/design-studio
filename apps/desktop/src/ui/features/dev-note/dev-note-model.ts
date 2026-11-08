import { copy } from "./copy.js";
import type { RouteOutput, SelectionContext, devNoteRoutes } from "./deps.js";

type DevNote = RouteOutput<typeof devNoteRoutes.createDevNote>;

type Measurements = NonNullable<DevNote["measurements"]>;

type NoteKind = DevNote["kind"];

interface KindOption {
  readonly kind: NoteKind;
  readonly label: string;
}

interface MeasureRow {
  readonly label: string;
  readonly token: string | null;
  readonly value: string;
}

const KIND_OPTIONS: readonly KindOption[] = [
  { kind: "spec", label: copy.kindSpec },
  { kind: "behavior", label: copy.kindBehavior },
  { kind: "content", label: copy.kindContent },
  { kind: "accessibility", label: copy.kindAccessibility },
];

const LAYER_ID = /:\d+:\d+$/u;

const toLayerId = (selection: SelectionContext): string | null => {
  const { source } = selection;

  if (source === null) {
    return null;
  }

  return `${source.file}:${source.line}:${source.col}`;
};

const toSourceText = (selection: SelectionContext): string | null => {
  const { source } = selection;

  if (source === null) {
    return null;
  }

  return `${source.file}:${source.line}`;
};

const isSelectableLayer = (layerId: string | null): layerId is string =>
  layerId !== null && LAYER_ID.test(layerId);

const toKindLabel = (kind: NoteKind): string => {
  const found = KIND_OPTIONS.find((option) => option.kind === kind);

  return found?.label ?? kind;
};

const toMeasureRows = (measurements: Measurements): MeasureRow[] => {
  const { box, padding, font } = measurements;

  return [
    {
      label: "Box",
      token: null,
      value: `${box.width} x ${box.height} px at ${box.x}, ${box.y}`,
    },
    { label: "Padding top", ...padding.top },
    { label: "Padding right", ...padding.right },
    { label: "Padding bottom", ...padding.bottom },
    { label: "Padding left", ...padding.left },
    { label: "Gap", ...measurements.gap },
    { label: "Radius", ...measurements.radius },
    { label: "Font size", ...font.size },
    { label: "Font weight", token: null, value: font.weight },
    { label: "Line height", token: null, value: font.lineHeight },
    { label: "Font family", token: null, value: font.family },
    { label: "Color", ...measurements.color },
    { label: "Background", ...measurements.background },
  ];
};

export {
  KIND_OPTIONS,
  isSelectableLayer,
  toKindLabel,
  toLayerId,
  toMeasureRows,
  toSourceText,
};

export type { DevNote, KindOption, MeasureRow, Measurements, NoteKind };
