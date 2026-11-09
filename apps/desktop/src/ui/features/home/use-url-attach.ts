import { useCallback, useEffect, useRef, useState } from "react";
import type { ChangeEvent, KeyboardEvent, RefObject } from "react";

import { getReferenceUrlProblem } from "../../domain/reference-url.js";

interface UrlAttach {
  readonly inputRef: RefObject<HTMLInputElement | null>;
  readonly onAddClick: () => void;
  readonly onKey: (event: KeyboardEvent<HTMLInputElement>) => void;
  readonly onText: (event: ChangeEvent<HTMLInputElement>) => void;
  readonly problem: string | null;
  readonly value: string;
}

const useUrlAttach = (
  onAdd: (url: string) => void,
  onCancel: () => void
): UrlAttach => {
  const [value, setValue] = useState("");
  const [problem, setProblem] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => inputRef.current?.focus(), []);

  const onText = useCallback((event: ChangeEvent<HTMLInputElement>): void => {
    setValue(event.target.value);
    setProblem(null);
  }, []);

  const onAddClick = useCallback((): void => {
    const found = getReferenceUrlProblem(value);

    if (found === null) {
      onAdd(value.trim());
    } else {
      setProblem(found);
    }
  }, [onAdd, value]);

  const onKey = useCallback(
    (event: KeyboardEvent<HTMLInputElement>): void => {
      if (event.nativeEvent.isComposing) {
        return;
      }

      if (event.key === "Enter") {
        event.preventDefault();
        onAddClick();
      }

      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        onCancel();
      }
    },
    [onCancel, onAddClick]
  );

  return { inputRef, onAddClick, onKey, onText, problem, value };
};

export { useUrlAttach };
