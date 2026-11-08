import { useCallback, useMemo } from "react";
import type { KeyboardEvent, ReactElement } from "react";

import { copy } from "./copy.js";

import styles from "./markup.module.css";

interface MarkupNoteFieldProps {
  readonly onCancel: () => void;
  readonly onCommit: (text: string) => void;
  readonly leftPercent: number;
  readonly topPercent: number;
}

const MarkupNoteField = ({
  onCancel,
  onCommit,
  leftPercent,
  topPercent,
}: MarkupNoteFieldProps): ReactElement => {
  const focusField = useCallback((node: HTMLInputElement | null): void => {
    node?.focus();
  }, []);

  const style = useMemo(
    () => ({ left: `${leftPercent}%`, top: `${topPercent}%` }),
    [leftPercent, topPercent]
  );

  const handleKey = useCallback(
    (event: KeyboardEvent<HTMLInputElement>): void => {
      if (event.key === "Enter") {
        event.preventDefault();
        onCommit(event.currentTarget.value);

        return;
      }

      if (event.key === "Escape") {
        event.stopPropagation();
        onCancel();
      }
    },
    [onCancel, onCommit]
  );

  return (
    <input
      aria-label={copy.noteLabel}
      className={styles.note}
      maxLength={80}
      onKeyDown={handleKey}
      placeholder={copy.notePlaceholder}
      ref={focusField}
      style={style}
      type="text"
    />
  );
};

export { MarkupNoteField };
