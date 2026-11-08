import { useCallback, useRef, useState } from "react";
import type { FocusEvent, KeyboardEvent } from "react";

interface DraftText {
  readonly change: (next: string) => void;
  readonly handleFocus: (event: FocusEvent<HTMLInputElement>) => void;
  readonly handleKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
  readonly handleSettle: () => void;
  readonly shown: string;
}

const useDraftText = (
  value: string,
  onChange: (next: string) => void
): DraftText => {
  const [text, setText] = useState<string | null>(null);
  const opener = useRef<HTMLElement | null>(null);

  const change = useCallback(
    (next: string): void => {
      setText(next);

      if (next.trim() !== "") {
        onChange(next.trim());
      }
    },
    [onChange]
  );

  const handleFocus = useCallback(
    (event: FocusEvent<HTMLInputElement>): void => {
      if (event.relatedTarget instanceof HTMLElement) {
        opener.current = event.relatedTarget;
      }
    },
    []
  );

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>): void => {
      if (event.key !== "Enter" && event.key !== "Escape") {
        return;
      }

      event.preventDefault();

      if (event.key === "Escape") {
        event.stopPropagation();
      }

      setText(null);
      opener.current?.focus();
    },
    []
  );

  const handleSettle = useCallback((): void => {
    setText(null);
  }, []);

  return {
    change,
    handleFocus,
    handleKeyDown,
    handleSettle,
    shown: text ?? value,
  };
};

export { useDraftText };

export type { DraftText };
