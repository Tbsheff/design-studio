import type { MatrixCell } from "./cells.js";

interface GridSlot {
  readonly cell: MatrixCell;
  readonly left: number;
  readonly top: number;
}

interface GridOrigin {
  readonly gap: number;
  readonly left: number;
  readonly top: number;
}

const toGrid = (
  cells: readonly MatrixCell[],
  origin: GridOrigin
): readonly GridSlot[] => {
  const { gap, left: startLeft, top: startTop } = origin;
  const slots: GridSlot[] = [];
  let left = startLeft;
  let top = startTop;
  let rowHeight = 0;
  let scheme = cells.at(0)?.scheme ?? "light";

  for (const cell of cells) {
    if (cell.scheme !== scheme) {
      ({ scheme } = cell);
      left = startLeft;
      top += rowHeight + gap;
      rowHeight = 0;
    }

    slots.push({ cell, left, top });
    left += cell.width + gap;
    rowHeight = Math.max(rowHeight, cell.height);
  }

  return slots;
};

export { toGrid };

export type { GridOrigin, GridSlot };
