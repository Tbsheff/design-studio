import { useCallback, useRef } from "react";
import type { FocusEvent, KeyboardEvent, ReactElement } from "react";

import styles from "./stacking.module.css";

interface StackingTextFieldProps {
  readonly disabled: boolean;
  readonly id: string;
  readonly label: string;
  readonly list: string;
  readonly tip: string;
  readonly value: string;
  readonly onCommit: (raw: string) => void;
}

const StackingTextField = ({
  disabled,
  id,
  label,
  list,
  tip,
  value,
  onCommit,
}: StackingTextFieldProps): ReactElement => {
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
        list={list}
        spellCheck={false}
        type="text"
        onBlur={handleSave}
        onKeyDown={handleKey}
      />
    </label>
  );
};

export { StackingTextField };

export type { StackingTextFieldProps };
