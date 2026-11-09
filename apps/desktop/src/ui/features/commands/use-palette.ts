import { useCallback, useId, useRef, useState } from "react";
import type { ChangeEvent, KeyboardEvent, RefObject } from "react";

import { toActiveId } from "./palette-model.js";
import type { Row } from "./palette-row-types.js";
import type { OpenTarget } from "./use-file-rows.js";
import { usePaletteFocus } from "./use-palette-focus.js";
import { usePaletteKeys } from "./use-palette-keys.js";
import { usePaletteRows } from "./use-palette-rows.js";
import { usePaletteRun } from "./use-palette-run.js";

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

interface PaletteInput {
  readonly isFiles: boolean;
  readonly isProjectsOnly: boolean;
  readonly onClose: () => void;
  readonly onEscape: () => void;
  readonly onOpenFile: (target: OpenTarget) => void;
  readonly onShortcuts: () => void;
}

const usePalette = (input: PaletteInput): PaletteState => {
  const { isFiles, isProjectsOnly, onClose, onEscape } = input;
  const { onOpenFile, onShortcuts } = input;
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const listId = useId();
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { isBusy, isLoading, rows } = usePaletteRows({
    isFiles,
    isProjectsOnly,
    onClose,
    onOpenFile,
    onShortcuts,
    query,
    setError,
  });

  const current = Math.min(active, Math.max(0, rows.length - 1));

  usePaletteFocus(inputRef, listRef, current, rows.length);

  const runRow = usePaletteRun(isBusy, onClose);

  const onKeyDown = usePaletteKeys({
    current,
    onEscape,
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
