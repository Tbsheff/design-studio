import { useCallback, useRef } from "react";
import type { FocusEvent, KeyboardEvent, ReactElement } from "react";

import { sectionCopy } from "./section-copy.js";

interface SectionNameInputProps {
  readonly label: string;
  readonly onDone: (raw: string | null) => void;
}

const focusInput = (element: HTMLInputElement | null): void => {
  element?.focus();
  element?.select();
};

const SectionNameInput = ({
  label,
  onDone,
}: SectionNameInputProps): ReactElement => {
  const isCancelled = useRef(false);

  const onBlur = useCallback(
    (event: FocusEvent<HTMLInputElement>): void => {
      if (isCancelled.current) {
        return;
      }

      onDone(event.target.value);
    },
    [onDone]
  );

  const onKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>): void => {
      if (event.key === "Enter") {
        isCancelled.current = true;
        onDone(event.currentTarget.value);
      }

      if (event.key === "Escape") {
        isCancelled.current = true;
        onDone(null);
      }
    },
    [onDone]
  );

  return (
    <input
      ref={focusInput}
      className="canvas-section-input"
      defaultValue={label}
      aria-label={sectionCopy.sectionLabel}
      maxLength={40}
      onBlur={onBlur}
      onKeyDown={onKeyDown}
    />
  );
};

export { SectionNameInput };
