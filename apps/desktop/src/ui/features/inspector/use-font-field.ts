import { useCallback, useState } from "react";
import type { ChangeEvent, KeyboardEvent } from "react";

import { varName } from "../../../shared/token-match.js";
import type { DirectEdit } from "./deps.js";
import type { TokenUi } from "./use-token-snap.js";

const PROP = "font-family";

interface FontFieldState {
  readonly handleBlur: () => void;
  readonly handleChange: (event: ChangeEvent<HTMLInputElement>) => void;
  readonly handleKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
  readonly isMixed: boolean;
  readonly raw: string;
  readonly shownText: string;
}

const toFirstFamily = (value: string): string =>
  value
    .split(",")[0]
    ?.replaceAll(/^["']|["']$/gu, "")
    .trim() ?? "";

const toShownFont = (
  text: string | null,
  value: string,
  ui: TokenUi | null
): string => {
  if (text !== null) {
    return text;
  }

  if (ui && varName(value)) {
    return value;
  }

  return toFirstFamily(value);
};

const useFontField = (ui: TokenUi | null, edit: DirectEdit): FontFieldState => {
  const [text, setText] = useState<string | null>(null);
  const value = edit.values[PROP];

  const settle = useCallback((): void => {
    setText(null);
    edit.commit();
  }, [edit]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>): void => {
      if (event.key === "Enter") {
        event.preventDefault();
        settle();

        return;
      }

      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        setText(null);
        edit.revert([PROP]);
      }
    },
    [edit, settle]
  );

  const handleChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>): void => {
      setText(event.target.value);

      if (event.target.value.trim()) {
        edit.preview({ [PROP]: event.target.value.trim() });
      }
    },
    [edit]
  );

  const handleBlur = settle;
  const isMixed = edit.mixed.has(PROP);
  const raw = value;
  const shownText = toShownFont(text, value, ui);

  return { handleBlur, handleChange, handleKeyDown, isMixed, raw, shownText };
};

export type { FontFieldState };

export { useFontField };
