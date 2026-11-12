import { useCallback, useRef, useState } from "react";
import type { FocusEvent, KeyboardEvent } from "react";

interface DraftText {
  readonly change: (next: string) => void;
  readonly handleFocus: (event: FocusEvent<HTMLInputElement>) => void;
  readonly handleKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
  readonly handleSettle: () => void;
  readonly isFocused: boolean;
  readonly shown: string;
}

const useDraftText = (
  value: string,
  onChange: (next: string) => void
): DraftText => {
  const [text, setText] = useState<string | null>(null);
  const [isFocused, setIsFocused] = useState(false);
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
      setIsFocused(true);

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
    setIsFocused(false);
  }, []);

  return {
    change,
    handleFocus,
    handleKeyDown,
    handleSettle,
    isFocused,
    shown: text ?? value,
  };
};

export { useDraftText };

export type { DraftText };
