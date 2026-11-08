import { useCallback, useState } from "react";
import type { ChangeEvent, KeyboardEvent } from "react";

import { toDefaultCount } from "./element-variants-model.js";

interface ElementVariantsState {
  readonly count: number;
  readonly note: string;
  readonly handleKeyDown: (event: KeyboardEvent<HTMLElement>) => void;
  readonly handleNote: (event: ChangeEvent<HTMLTextAreaElement>) => void;
  readonly handleStart: () => void;
  readonly handleCount: (count: number) => void;
}

const useElementVariants = (
  max: number,
  onStart: (note: string, count: number) => void,
  onCancel: () => void
): ElementVariantsState => {
  const [note, setNote] = useState("");
  const [count, setCount] = useState(() => toDefaultCount(max));

  const handleCount = useCallback((next: number): void => {
    setCount(next);
  }, []);

  const handleStart = useCallback((): void => {
    onStart(note, count);
  }, [count, note, onStart]);

  const handleNote = useCallback(
    (changeEvent: ChangeEvent<HTMLTextAreaElement>): void => {
      setNote(changeEvent.target.value);
    },
    []
  );

  const handleKeyDown = useCallback(
    (keyboardEvent: KeyboardEvent<HTMLElement>): void => {
      if (keyboardEvent.key === "Escape") {
        onCancel();
      }

      if (
        keyboardEvent.key === "Enter" &&
        (keyboardEvent.metaKey || keyboardEvent.ctrlKey)
      ) {
        handleStart();
      }
    },
    [handleStart, onCancel]
  );

  return {
    count,
    handleCount,
    handleKeyDown,
    handleNote,
    handleStart,
    note,
  };
};

export { useElementVariants };
