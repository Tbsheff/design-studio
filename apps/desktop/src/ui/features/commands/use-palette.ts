import { useCallback, useId, useRef, useState } from "react";
import type { ChangeEvent, KeyboardEvent, RefObject } from "react";

import { noteRecent, toActiveId } from "./palette-model.js";
import type { Row } from "./palette-row-types.js";
import { usePaletteFocus } from "./use-palette-focus.js";
import { usePaletteKeys } from "./use-palette-keys.js";
import { usePaletteRows } from "./use-palette-rows.js";

interface PaletteState {
  activeId: string;
  changeQuery: (event: ChangeEvent<HTMLInputElement>) => void;
  current: number;
  error: string | null;
  inputRef: RefObject<HTMLInputElement | null>;
  isBusy: boolean;
  isLoading: boolean;
  listId: string;
  listRef: RefObject<HTMLDivElement | null>;
  onKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
  query: string;
  rows: Row[];
  runRow: (row: Row) => void;
  setActive: (index: number) => void;
}

const usePalette = (
  onClose: () => void,
  onShortcuts: () => void,
  isProjectsOnly: boolean
): PaletteState => {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const listId = useId();
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const rowInput = { isProjectsOnly, onClose, onShortcuts, query, setError };
  const { isBusy, isLoading, rows } = usePaletteRows(rowInput);

  const current = Math.min(active, Math.max(0, rows.length - 1));

  usePaletteFocus(inputRef, listRef, current, rows.length);

  const runRow = useCallback(
    (row: Row): void => {
      if (row.disabled || isBusy) {
        return;
      }

      if (row.commandId) {
        noteRecent(row.commandId);
      }

      if (row.kind !== "command") {
        row.run();

        return;
      }

      onClose();
      globalThis.setTimeout(() => row.run(), 0);
    },
    [isBusy, onClose]
  );

  const onKeyDown = usePaletteKeys({
    current,
    onClose,
    query,
    rows,
    runRow,
    setActive,
    setQuery,
  });

  const changeQuery = useCallback(
    (event: ChangeEvent<HTMLInputElement>): void => {
      setQuery(event.target.value);
      setActive(0);
      setError(null);
    },
    []
  );

  return {
    activeId: toActiveId(listId, rows, current),
    changeQuery,
    current,
    error,
    inputRef,
    isBusy,
    isLoading,
    listId,
    listRef,
    onKeyDown,
    query,
    rows,
    runRow,
    setActive,
  };
};

export { usePalette };

export type { PaletteState };
