import { useCallback, useState } from "react";
import type { ChangeEvent, InputEvent, KeyboardEvent } from "react";

import { isValidColor } from "./css-values.js";
import type { FieldProps } from "./use-same-field.js";

interface ColorFieldState {
  readonly text: string | null;
  readonly handleSettle: () => void;
  readonly handleKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
  readonly handleTextChange: (event: ChangeEvent<HTMLInputElement>) => void;
  readonly handleSwatchInput: (event: InputEvent<HTMLInputElement>) => void;
  readonly handleSwatchChange: (event: ChangeEvent<HTMLInputElement>) => void;
}

const useColorField = ({
  prop,
  edit,
}: Pick<FieldProps, "edit" | "prop">): ColorFieldState => {
  const [text, setText] = useState<string | null>(null);

  const handleSettle = useCallback((): void => {
    if (text !== null && !isValidColor(text)) {
      edit.revert([prop]);
    }

    setText(null);
    edit.commit();
  }, [text, edit, prop]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>): void => {
      if (event.key === "Enter" && !event.nativeEvent.isComposing) {
        event.preventDefault();
        handleSettle();
      }

      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        setText(null);
        edit.revert([prop]);
      }
    },
    [handleSettle, edit, prop]
  );

  const handleTextChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>): void => {
      const next = event.target.value;
      setText(next);

      if (isValidColor(next)) {
        edit.preview({ [prop]: next.trim() });
      }
    },
    [edit, prop]
  );

  const handleSwatchInput = useCallback(
    (event: InputEvent<HTMLInputElement>): void => {
      edit.preview({ [prop]: event.currentTarget.value });
    },
    [edit, prop]
  );

  const handleSwatchChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>): void => {
      edit.preview({ [prop]: event.currentTarget.value });
      edit.commitSoon();
    },
    [edit, prop]
  );

  return {
    handleKeyDown,
    handleSettle,
    handleSwatchChange,
    handleSwatchInput,
    handleTextChange,
    text,
  };
};

export { useColorField };
