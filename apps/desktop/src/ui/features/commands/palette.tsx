import { useCallback } from "react";
import type { MouseEvent, ReactElement, RefObject } from "react";

import { copy } from "./copy.js";
import { HealthDot } from "./deps.js";
import { Keys } from "./keys.js";
import { PaletteError } from "./palette-error.js";
import { PaletteFoot } from "./palette-foot.js";
import { Marked } from "./palette-marked.js";
import { toEmptyText, toGroupHeads, toRowNote } from "./palette-model.js";
import { RowLead } from "./palette-row-lead.js";
import { typePair } from "./palette-rows.js";
import type { Row } from "./palette-rows.js";
import { PaletteSearch } from "./palette-search.js";
import { usePalette } from "./use-palette.js";

const RowEnd = ({
  row,
  isActive,
  isTyping,
}: {
  row: Row;
  isActive: boolean;
  isTyping: boolean;
}): ReactElement => {
  const isEnter = isTyping && isActive && !row.disabled;
  const note = toRowNote(row, isEnter);
  const isPlain = Boolean(row.hit) && row.kind === "project" && !row.icon;
  const hit = row.hit ?? null;

  return (
    <span className="cmdk-end">
      {note && <span className="cmdk-note">{note}</span>}
      {isPlain && hit?.health?.level === "failed" && (
        <HealthDot hit={hit} className="cmdk-dot" />
      )}
      {isPlain && hit && (
        <span className="cmdk-type">{typePair(hit.type)}</span>
      )}
      {isEnter && <Keys keys="Enter" className="cmdk-keys" />}
      {!isEnter && row.keys && <Keys keys={row.keys} className="cmdk-keys" />}
    </span>
  );
};

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
    <div
      id={`${listId}-${index}`}
      role="option"
      aria-selected={isCurrent}
      aria-disabled={Boolean(row.disabled)}
      data-index={index}
      data-kind={row.kind}
      className="cmdk-row"
      onMouseMove={hoverRow}
      onClick={runRow}
    >
      <RowLead row={row} />
      <span className="cmdk-title truncate">
        <Marked text={row.title} marks={row.marks} />
      </span>
      {row.meta && <span className="cmdk-meta truncate">{row.meta}</span>}
      <RowEnd row={row} isActive={isCurrent} isTyping={isTyping} />
    </div>
  );
};

const PaletteList = ({
  listRef,
  listId,
  rows,
  current,
  query,
  isLoading,
  onHover,
  onRun,
}: {
  listRef: RefObject<HTMLDivElement | null>;
  listId: string;
  rows: Row[];
  current: number;
  query: string;
  isLoading: boolean;
  onHover: (index: number) => void;
  onRun: (row: Row) => void;
}): ReactElement => {
  const heads = toGroupHeads(rows);
  const isTyping = query.trim() !== "";

  return (
    <div
      className="cmdk-list"
      role="listbox"
      id={listId}
      ref={listRef}
      aria-label={copy.results}
    >
      {rows.length === 0 && (
        <p className="cmdk-empty">{toEmptyText(isLoading, query)}</p>
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

const Palette = ({
  onClose,
  onShortcuts,
}: {
  onClose: () => void;
  onShortcuts: () => void;
}): ReactElement => {
  const palette = usePalette(onClose, onShortcuts);
  const { changeQuery, onKeyDown, runRow, setActive } = palette;

  const closeOnBackdrop = useCallback(
    (event: MouseEvent<HTMLDivElement>): void => {
      if (event.target === event.currentTarget) {
        onClose();
      }
    },
    [onClose]
  );

  return (
    <div className="cmdk-backdrop" onMouseDown={closeOnBackdrop}>
      <dialog
        open
        className="cmdk"
        aria-label={copy.palette}
        aria-busy={palette.isBusy}
      >
        <PaletteSearch
          inputRef={palette.inputRef}
          listId={palette.listId}
          activeId={palette.activeId}
          query={palette.query}
          isBusy={palette.isBusy}
          onChange={changeQuery}
          onKeyDown={onKeyDown}
        />
        <PaletteError error={palette.error} />
        <PaletteList
          listRef={palette.listRef}
          listId={palette.listId}
          rows={palette.rows}
          current={palette.current}
          query={palette.query}
          isLoading={palette.isLoading}
          onHover={setActive}
          onRun={runRow}
        />
        <PaletteFoot />
      </dialog>
    </div>
  );
};

export { Palette };
