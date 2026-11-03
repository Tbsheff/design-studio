import type { GalleryAxes } from "./axes.js";

type GalleryState = "default" | "disabled" | "focus" | "hover";

type PropValue = boolean | number | string;

interface GalleryCell {
  readonly column: number;
  readonly id: string;
  readonly label: string;
  readonly props: Record<string, PropValue>;
  readonly row: number;
  readonly size: string | null;
  readonly state: GalleryState;
  readonly variant: string | null;
}

interface CellRequest {
  readonly axes: GalleryAxes;
  readonly overrides: Readonly<Record<string, PropValue>>;
  readonly states: readonly GalleryState[];
}

const DEFAULT_STATES: readonly GalleryState[] = [
  "default",
  "hover",
  "focus",
  "disabled",
];

const orNone = (values: readonly string[]): readonly (string | null)[] => {
  if (values.length === 0) {
    return [null];
  }

  return values;
};

const statesOf = (states: readonly GalleryState[]): readonly GalleryState[] => {
  if (states.length === 0) {
    return DEFAULT_STATES;
  }

  return DEFAULT_STATES.filter((state) => states.includes(state));
};

const propsOf = (
  request: CellRequest,
  pick: {
    readonly size: string | null;
    readonly state: GalleryState;
    readonly variant: string | null;
  }
): GalleryCell["props"] => {
  const { axes } = request;
  const props: GalleryCell["props"] = { ...request.overrides };

  if (axes.variantProp !== null && pick.variant !== null) {
    props[axes.variantProp] = pick.variant;
  }

  if (axes.sizeProp !== null && pick.size !== null) {
    props[axes.sizeProp] = pick.size;
  }

  if (pick.state === "disabled" && axes.hasDisabled) {
    props["disabled"] = true;
  }

  return props;
};

const labelOf = (
  variant: string | null,
  size: string | null,
  state: GalleryState
): string => `${variant ?? "default"} ${size ?? "default"} ${state}`;

const toCells = (request: CellRequest): readonly GalleryCell[] => {
  const variants = orNone(request.axes.variants);
  const sizes = orNone(request.axes.sizes);
  const states = statesOf(request.states);
  const cells: GalleryCell[] = [];

  for (const [row, variant] of variants.entries()) {
    for (const [sizeAt, size] of sizes.entries()) {
      for (const [stateAt, state] of states.entries()) {
        const column = sizeAt * states.length + stateAt;

        const id = `r${row}c${column}`;
        const label = labelOf(variant, size, state);
        const props = propsOf(request, { size, state, variant });

        cells.push({ column, id, label, props, row, size, state, variant });
      }
    }
  }

  return cells;
};

const columnLabels = (cells: readonly GalleryCell[]): readonly string[] => {
  const labels: string[] = [];

  for (const cell of cells) {
    labels[cell.column] = `${cell.size ?? "default"} ${cell.state}`;
  }

  return labels;
};

const rowLabels = (cells: readonly GalleryCell[]): readonly string[] => {
  const labels: string[] = [];

  for (const cell of cells) {
    labels[cell.row] = cell.variant ?? "default";
  }

  return labels;
};

export { columnLabels, rowLabels, toCells };

export type { CellRequest, GalleryCell, GalleryState, PropValue };
