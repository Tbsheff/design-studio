import { useCallback, useEffect, useRef, useState } from "react";
import type { ChangeEvent, KeyboardEvent, RefObject } from "react";

import type { Candidate } from "./match-candidates-model.js";
import {
  toFilter,
  toPickedToken,
  toShownCandidates,
} from "./match-picker-model.js";

interface TokenPickerState {
  readonly text: string;
  readonly shown: Candidate[];
  readonly rootRef: RefObject<HTMLElement | null>;
  readonly inputRef: RefObject<HTMLInputElement | null>;
  readonly submit: () => void;
  readonly change: (event: ChangeEvent<HTMLInputElement>) => void;
  readonly keyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
}

const useTokenPicker = (
  candidates: Candidate[],
  onPick: (token: string) => void,
  onClose: () => void
): TokenPickerState => {
  const [text, setText] = useState("");
  const rootRef = useRef<HTMLElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    inputRef.current?.focus();
    rootRef.current?.scrollIntoView({ block: "nearest" });
  }, []);
  const filter = toFilter(text);
  const shown = toShownCandidates(candidates, filter);

  const submit = useCallback(() => onPick(text.trim()), [onPick, text]);

  const change = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => setText(event.target.value),
    []
  );

  const keyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>): void => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        onClose();

        return;
      }

      if (
        event.key === "Enter" &&
        text.trim() &&
        !event.nativeEvent.isComposing
      ) {
        event.preventDefault();
        onPick(toPickedToken(shown, filter, text));
      }
    },
    [onClose, onPick, shown, filter, text]
  );

  return { change, inputRef, keyDown, rootRef, shown, submit, text };
};

export { useTokenPicker };

export type { TokenPickerState };
