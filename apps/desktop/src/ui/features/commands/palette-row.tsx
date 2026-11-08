import { useCallback } from "react";
import type { ReactElement } from "react";

import { Marked } from "./palette-marked.js";
import { PaletteRowEnd } from "./palette-row-end.js";
import { RowLead } from "./palette-row-lead.js";
import type { Row } from "./palette-row-types.js";

const OPTION_ROLE = "option";

const PaletteRow = ({
  row,
  listId,
  index,
  isCurrent,
  isTyping,
  onHover,
  onRun,
}: {
  row: Row;
  listId: string;
  index: number;
  isCurrent: boolean;
  isTyping: boolean;
  onHover: (index: number) => void;
  onRun: (row: Row) => void;
}): ReactElement => {
  const hoverRow = useCallback((): void => {
    if (!isCurrent) {
      onHover(index);
    }
  }, [index, isCurrent, onHover]);

  const runRow = useCallback((): void => onRun(row), [onRun, row]);

  return (
    <button
      type="button"
      id={`${listId}-${index}`}
      role={OPTION_ROLE}
      aria-selected={isCurrent}
      aria-disabled={Boolean(row.disabled)}
      data-index={index}
      data-kind={row.kind}
      className="cmdk-row"
      onMouseMove={hoverRow}
      onClick={runRow}
      tabIndex={-1}
    >
      <RowLead row={row} />
      <span className="cmdk-title truncate">
        <Marked text={row.title} marks={row.marks} />
      </span>
      {row.meta && <span className="cmdk-meta truncate">{row.meta}</span>}
      <PaletteRowEnd row={row} isActive={isCurrent} isTyping={isTyping} />
    </button>
  );
};

export { PaletteRow };
