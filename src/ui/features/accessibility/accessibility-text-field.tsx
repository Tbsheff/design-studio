import { useCallback, useRef } from "react";
import type { FocusEvent, KeyboardEvent, ReactElement } from "react";

import styles from "./accessibility.module.css";

interface AccessibilityTextFieldProps {
  readonly disabled: boolean;
  readonly id: string;
  readonly inputMode: "numeric" | "text";
  readonly label: string;
  readonly tip: string;
  readonly value: string;
  readonly onCommit: (raw: string) => void;
}

const AccessibilityTextField = ({
  disabled,
  id,
  inputMode,
  label,
  tip,
  value,
  onCommit,
}: AccessibilityTextFieldProps): ReactElement => {
  const sent = useRef(value);

  const commit = useCallback(
    (raw: string): void => {
      const text = raw.trim();

      if (text === value || text === sent.current) {
        return;
      }

      sent.current = text;
      onCommit(text);
    },
    [onCommit, value]
  );

  const handleSave = useCallback(
    (event: FocusEvent<HTMLInputElement>): void => {
      commit(event.target.value);
    },
    [commit]
  );

  const handleKey = useCallback(
    (event: KeyboardEvent<HTMLInputElement>): void => {
      if (event.key === "Enter") {
        commit(event.currentTarget.value);
      }

      if (event.key === "Escape") {
        event.currentTarget.value = value;
      }
    },
    [commit, value]
  );

  return (
    <label className="ins-field" data-tip={tip} htmlFor={id}>
      <span className={styles.label}>{label}</span>
      <input
        key={value}
        aria-label={label}
        className="ins-input"
        defaultValue={value}
        disabled={disabled}
        id={id}
        inputMode={inputMode}
        spellCheck={false}
        type="text"
        onBlur={handleSave}
        onKeyDown={handleKey}
      />
    </label>
  );
};

export { AccessibilityTextField };

export type { AccessibilityTextFieldProps };
