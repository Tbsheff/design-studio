import type { ReactElement, RefObject } from "react";

import { copy } from "./copy.js";
import { toEmptyText, toGroupHeads } from "./palette-model.js";
import type { Row } from "./palette-row-types.js";
import { PaletteRow } from "./palette-row.js";

const LISTBOX_ROLE = "listbox";

const PaletteList = ({
  listRef,
  listId,
  rows,
  current,
  query,
  isLoading,
  isFiles,
  onHover,
  onRun,
}: {
  listRef: RefObject<HTMLDivElement | null>;
  listId: string;
  rows: Row[];
  current: number;
  query: string;
  isLoading: boolean;
  isFiles: boolean;
  onHover: (index: number) => void;
  onRun: (row: Row) => void;
}): ReactElement => {
  const heads = toGroupHeads(rows);
  const isTyping = query.trim() !== "";

  return (
    <div
      className="cmdk-list"
      role={LISTBOX_ROLE}
      id={listId}
      ref={listRef}
      aria-label={copy.results}
    >
      {rows.length === 0 && (
        <p className="cmdk-empty">{toEmptyText(isLoading, query, isFiles)}</p>
      )}
      {rows.map((row, index) => (
        <div key={`${row.group}-${row.key}`} role="presentation">
          {heads[index] && (
            <div className="cmdk-group" role="presentation">
              {heads[index]}
            </div>
          )}
          <PaletteRow
            row={row}
            listId={listId}
            index={index}
            isCurrent={index === current}
            isTyping={isTyping}
            onHover={onHover}
            onRun={onRun}
          />
        </div>
      ))}
    </div>
  );
};

export { PaletteList };
