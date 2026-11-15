import { useCallback, useMemo, useState } from "react";
import type { ChangeEvent, KeyboardEvent } from "react";

import { isValidColor } from "./css-value-model.js";
import type { ColorTarget } from "./use-color-popup.js";
import type { FieldProps } from "./use-same-field.js";

interface ColorFieldState {
  readonly text: string | null;
  readonly handleSettle: () => void;
  readonly handleKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
  readonly handleTextChange: (event: ChangeEvent<HTMLInputElement>) => void;
  readonly target: ColorTarget;
}

const useColorField = ({
  prop,
  edit,
  shown,
}: Pick<FieldProps, "edit" | "prop"> & {
  readonly shown: string;
}): ColorFieldState => {
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

  const target = useMemo(
    (): ColorTarget => ({
      onCommit: (next: string): void => {
        edit.preview({ [prop]: next });
        edit.commitSoon();
      },
      onPreview: (next: string): void => edit.preview({ [prop]: next }),
      onRevert: (base: string): void => {
        edit.preview({ [prop]: base });
        edit.revert([prop]);
      },
      value: shown,
    }),
    [edit, prop, shown]
  );

  return {
    handleKeyDown,
    handleSettle,
    handleTextChange,
    target,
    text,
  };
};

export { useColorField };
