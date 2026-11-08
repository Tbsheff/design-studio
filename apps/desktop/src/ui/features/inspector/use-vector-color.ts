import { useCallback, useState } from "react";
import type { ChangeEvent, KeyboardEvent } from "react";

import { VECTOR_COLOR } from "../../../shared/vector.js";
import { toHexColor } from "./css-value-model.js";
import {
  DEFAULT_HEX,
  isValidPaint,
  toPaintValue,
  toShownColor,
} from "./vector-model.js";

interface VectorColorState {
  readonly handleBlur: () => void;
  readonly handleChange: (event: ChangeEvent<HTMLInputElement>) => void;
  readonly handleKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
  readonly handleSwatch: (event: ChangeEvent<HTMLInputElement>) => void;
  readonly hex: string;
  readonly isInvalid: boolean;
  readonly shown: string;
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

  const handleSwatch = useCallback(
    (event: ChangeEvent<HTMLInputElement>): void =>
      onSave(event.currentTarget.value),
    [onSave]
  );

  const hex = toHexColor(value) ?? DEFAULT_HEX;
  const isInvalid = text !== null && !isValidPaint(text, VECTOR_COLOR);
  const shown = text ?? toShownColor(value);

  return {
    handleBlur,
    handleChange,
    handleKeyDown,
    handleSwatch,
    hex,
    isInvalid,
    shown,
  };
};

export { useVectorColor };
