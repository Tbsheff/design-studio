import { useCallback } from "react";
import type { KeyboardEvent } from "react";

import { toRecentRow, toStep } from "./palette-model.js";
import type { Row } from "./palette-row-types.js";

interface PaletteKeyInput {
  current: number;
  onEscape: () => void;
  query: string;
  rows: Row[];
  runRow: (row: Row) => void;
  setActive: (index: number) => void;
  setQuery: (query: string) => void;
}

const usePaletteKeys = (
  input: PaletteKeyInput
): ((event: KeyboardEvent<HTMLInputElement>) => void) => {
  const { current, onEscape, query, rows, runRow, setActive, setQuery } = input;

  const closeOrClear = useCallback((): void => {
    if (query) {
      setQuery("");

      return;
    }

    onEscape();
  }, [onEscape, query, setQuery]);

  return useCallback(
    (event: KeyboardEvent<HTMLInputElement>): void => {
      const step = toStep(event);
      const recentRow = toRecentRow(event.nativeEvent, rows);
      const isTyping = query.trim() !== "";

      if (step !== 0 && rows.length > 0) {
        event.preventDefault();
        setActive((current + step + rows.length) % rows.length);

        return;
      }

      if (recentRow && !isTyping) {
        event.preventDefault();
        event.stopPropagation();
        runRow(recentRow);

        return;
      }

      if (event.key === "Enter" && !event.nativeEvent.isComposing) {
        event.preventDefault();
        const row = rows[current];

        if (row) {
          runRow(row);
        }

        return;
      }

      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        closeOrClear();
      }
    },
    [closeOrClear, current, query, rows, runRow, setActive]
  );
};

export { usePaletteKeys };
