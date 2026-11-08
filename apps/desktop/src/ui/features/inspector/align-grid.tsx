import { useCallback } from "react";
import type { ReactElement } from "react";

import { AlignCellButton } from "./align-cell-button.js";
import { GRID_STEPS, toAlignPatch, toCellLabel } from "./auto-layout-model.js";
import { copy } from "./copy.js";
import { activeCell, alignCell } from "./sizing.js";
import type { DirectEdit } from "./use-direct-edit.js";
import { setEdit } from "./use-layout-keys.js";

interface Props {
  readonly edit: DirectEdit;
  readonly isRow: boolean;
  readonly isGrid: boolean;
}

const AlignGrid = ({ edit, isRow, isGrid }: Props): ReactElement => {
  let justifyProp: "justify-content" | "justify-items" = "justify-content";

  if (isGrid) {
    justifyProp = "justify-items";
  }

  const active = activeCell(
    edit.values[justifyProp],
    edit.values["align-items"],
    isRow
  );

  const handlePick = useCallback(
    (col: number, row: number): void => {
      setEdit(edit, toAlignPatch(alignCell(col, row, isRow), isGrid));
    },
    [edit, isGrid, isRow]
  );

  return (
    <fieldset className="ins-align-grid" aria-label={copy.alignment}>
      {GRID_STEPS.map((row) =>
        GRID_STEPS.map((col) => (
          <AlignCellButton
            key={`${row}-${col}`}
            col={col}
            row={row}
            isOn={active?.col === col && active.row === row}
            label={toCellLabel(row, col)}
            onPick={handlePick}
          />
        ))
      )}
    </fieldset>
  );
};

export { AlignGrid };
