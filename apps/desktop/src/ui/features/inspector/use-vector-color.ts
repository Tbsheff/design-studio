import { useCallback, useMemo, useState } from "react";
import type { ChangeEvent, KeyboardEvent } from "react";

import { VECTOR_COLOR } from "../../../shared/vector.js";
import type { ColorTarget } from "./use-color-popup.js";
import { isValidPaint, toPaintValue, toShownColor } from "./vector-model.js";

interface VectorColorState {
  readonly handleBlur: () => void;
  readonly handleChange: (event: ChangeEvent<HTMLInputElement>) => void;
  readonly handleKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
  readonly isInvalid: boolean;
  readonly shown: string;
  readonly target: ColorTarget;
}

const useVectorColor = (
  value: string,
  onSave: (value: string | null) => void
): VectorColorState => {
  const [text, setText] = useState<string | null>(null);

  const handleBlur = useCallback((): void => {
    if (text === null) {
      return;
    }

    const next = text.trim();
    setText(null);

    if (
      !isValidPaint(next, VECTOR_COLOR) ||
      next.toLowerCase() === value.toLowerCase()
    ) {
      return;
    }

    onSave(toPaintValue(next));
  }, [text, value, onSave]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>): void => {
      if (event.key === "Enter") {
        handleBlur();

        return;
      }

      if (event.key === "Escape") {
        event.stopPropagation();
        setText(null);
      }
    },
    [handleBlur]
  );

  const handleChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>): void => setText(event.target.value),
    []
  );

  const target = useMemo(
    (): ColorTarget => ({
      onCommit: onSave,
      onPreview: null,
      onRevert: null,
      value,
    }),
    [onSave, value]
  );

  const isInvalid = text !== null && !isValidPaint(text, VECTOR_COLOR);
  const shown = text ?? toShownColor(value);

  return {
    handleBlur,
    handleChange,
    handleKeyDown,
    isInvalid,
    shown,
    target,
  };
};

export { useVectorColor };
