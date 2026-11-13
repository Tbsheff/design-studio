const LAYOUT_GRID_COLUMNS_MAX = 24;

const LAYOUT_GRID_GUTTER_MAX = 200;

const LAYOUT_GRID_MARGIN_MAX = 400;

const LAYOUT_GRID_ROW_STEP_MIN = 2;

const LAYOUT_GRID_ROW_STEP_MAX = 64;

interface CanvasLayoutGrid {
  readonly columns: number;
  readonly gutter: number;
  readonly margin: number;
  readonly rowStep: number | null;
}

const isGridInt = (value: number, min: number, max: number): boolean =>
  Number.isInteger(value) && value >= min && value <= max;

const isRowStep = (rowStep: number | null): boolean =>
  rowStep === null ||
  isGridInt(rowStep, LAYOUT_GRID_ROW_STEP_MIN, LAYOUT_GRID_ROW_STEP_MAX);

const toLayoutGrid = (
  grid: CanvasLayoutGrid | null | undefined
): CanvasLayoutGrid | null => {
  if (!grid) {
    return null;
  }

  const rowStep = grid.rowStep ?? null;

  if (
    !isRowStep(rowStep) ||
    !isGridInt(grid.columns, 1, LAYOUT_GRID_COLUMNS_MAX) ||
    !isGridInt(grid.gutter, 0, LAYOUT_GRID_GUTTER_MAX) ||
    !isGridInt(grid.margin, 0, LAYOUT_GRID_MARGIN_MAX)
  ) {
    return null;
  }

  return {
    columns: grid.columns,
    gutter: grid.gutter,
    margin: grid.margin,
    rowStep,
  };
};

export {
  LAYOUT_GRID_COLUMNS_MAX,
  LAYOUT_GRID_GUTTER_MAX,
  LAYOUT_GRID_MARGIN_MAX,
  LAYOUT_GRID_ROW_STEP_MAX,
  LAYOUT_GRID_ROW_STEP_MIN,
  toLayoutGrid,
};

export type { CanvasLayoutGrid };
