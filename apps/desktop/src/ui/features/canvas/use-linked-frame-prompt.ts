import { useCallback, useMemo, useState } from "react";
import type {
  ChangeEvent,
  CSSProperties,
  FormEvent,
  KeyboardEvent,
} from "react";

import type { LinkedDrop } from "./linked-frame-model.js";
import type { LinkedFrameControl } from "./use-linked-frame.js";

interface LinkedFramePromptState {
  readonly focusInput: (input: HTMLInputElement | null) => void;
  readonly ghostStyle: CSSProperties | null;
  readonly handleEscapeKey: (event: KeyboardEvent<HTMLInputElement>) => void;
  readonly handlePromptSubmit: (event: FormEvent<HTMLFormElement>) => void;
  readonly handleTextInput: (event: ChangeEvent<HTMLInputElement>) => void;
  readonly promptStyle: CSSProperties;
  readonly text: string;
}

const PROMPT_OFFSET = 12;

const toGhostStyle = (drop: LinkedDrop | null): CSSProperties | null => {
  const ghost = drop?.ghost ?? null;

  if (ghost === null) {
    return null;
  }

  return {
    height: ghost.height,
    left: ghost.x,
    top: ghost.y,
    width: ghost.width,
  };
};

const toPromptStyle = (drop: LinkedDrop | null): CSSProperties => ({
  left: (drop?.at.x ?? 0) + PROMPT_OFFSET,
  top: (drop?.at.y ?? 0) + PROMPT_OFFSET,
});

const useLinkedFramePrompt = (
  control: LinkedFrameControl
): LinkedFramePromptState => {
  const [text, setText] = useState("");
  const { drop, onCancel, onSubmit } = control;
  const ghostStyle = useMemo(() => toGhostStyle(drop), [drop]);
  const promptStyle = useMemo(() => toPromptStyle(drop), [drop]);

  const focusInput = useCallback(
    (input: HTMLInputElement | null): void => input?.focus(),
    []
  );

  const handleTextInput = useCallback(
    (event: ChangeEvent<HTMLInputElement>): void => setText(event.target.value),
    []
  );

  const handlePromptSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>): void => {
      event.preventDefault();
      onSubmit(text);
      setText("");
    },
    [onSubmit, text]
  );

  const handleEscapeKey = useCallback(
    (event: KeyboardEvent<HTMLInputElement>): void => {
      if (event.key !== "Escape") {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      setText("");
      onCancel();
    },
    [onCancel]
  );

  return {
    focusInput,
    ghostStyle,
    handleEscapeKey,
    handlePromptSubmit,
    handleTextInput,
    promptStyle,
    text,
  };
};

export { useLinkedFramePrompt };

export type { LinkedFramePromptState };
