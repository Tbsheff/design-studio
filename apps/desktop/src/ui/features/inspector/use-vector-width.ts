import { useCallback, useState } from "react";
import type { ChangeEvent, KeyboardEvent } from "react";

interface VectorWidthState {
  readonly handleBlur: () => void;
  readonly handleChange: (event: ChangeEvent<HTMLInputElement>) => void;
  readonly handleKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
  readonly shown: string;
}

const useVectorWidth = (
  value: string,
  onSave: (value: number | null) => void
): VectorWidthState => {
  const [text, setText] = useState<string | null>(null);

  const handleBlur = useCallback((): void => {
    if (text === null) {
      return;
    }

    const next = text.trim();
    setText(null);

    if (next === value) {
      return;
    }

    if (next === "") {
      onSave(null);

      return;
    }

    const width = Number(next);

    if (Number.isFinite(width) && width >= 0) {
      onSave(width);
    }
  }, [text, value, onSave]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>): void => {
      if (event.key === "Enter") {
        handleBlur();
      }
    },
    [handleBlur]
  );

  const handleChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>): void => setText(event.target.value),
    []
  );

  return { handleBlur, handleChange, handleKeyDown, shown: text ?? value };
};

export { useVectorWidth };
