import { useLayoutEffect } from "react";
import type { RefObject } from "react";

import { findElement } from "./deps.js";

const FOCUS_OPTIONS: ScrollIntoViewOptions = { block: "nearest" };

const usePaletteFocus = (
  inputRef: RefObject<HTMLInputElement | null>,
  listRef: RefObject<HTMLDivElement | null>,
  current: number,
  rowCount: number
): void => {
  useLayoutEffect(() => {
    inputRef.current?.focus();
  }, [inputRef]);

  useLayoutEffect(() => {
    if (listRef.current && rowCount > 0) {
      findElement(listRef.current, `[data-index="${current}"]`)?.scrollIntoView(
        FOCUS_OPTIONS
      );
    }
  }, [current, listRef, rowCount]);
};

export { usePaletteFocus };
