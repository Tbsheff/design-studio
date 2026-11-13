import type { CanvasLayoutGrid } from "@design-studio/contracts/layout-grid";

type LayoutGridFit =
  | { readonly ok: true; readonly value: CanvasLayoutGrid }
  | { readonly ok: false; readonly code: "too-wide" };

const toColumnWidth = (grid: CanvasLayoutGrid, frameWidth: number): number =>
  (frameWidth - grid.margin * 2 - grid.gutter * (grid.columns - 1)) /
  grid.columns;

const toLayoutGridFit = (
  grid: CanvasLayoutGrid,
  frameWidth: number
): LayoutGridFit => {
  if (toColumnWidth(grid, frameWidth) < 1) {
    return { code: "too-wide", ok: false };
  }

  return {
    ok: true,
    value: {
      columns: grid.columns,
      gutter: grid.gutter,
      margin: grid.margin,
      rowStep: grid.rowStep,
    },
  };
};

export { toColumnWidth, toLayoutGridFit };

export type { LayoutGridFit };
