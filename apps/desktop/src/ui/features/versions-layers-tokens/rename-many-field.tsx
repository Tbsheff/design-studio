import type { ChangeEvent, KeyboardEvent, ReactNode, RefObject } from "react";

import styles from "./rename-many.module.css";

interface RenameManyFieldProps {
  readonly inputRef: RefObject<HTMLInputElement | null> | null;
  readonly isDisabled: boolean;
  readonly label: string;
  readonly name: string;
  readonly onFieldKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
  readonly onValueChange: (event: ChangeEvent<HTMLInputElement>) => void;
  readonly value: string;
}

const RenameManyField = ({
  inputRef,
  isDisabled,
  label,
  name,
  onFieldKeyDown,
  onValueChange,
  value,
}: RenameManyFieldProps): ReactNode => (
  <label className={styles.field}>
    {label}
    <input
      ref={inputRef}
      name={name}
      className={styles.input}
      value={value}
      spellCheck={false}
      autoComplete="off"
      disabled={isDisabled}
      onChange={onValueChange}
      onKeyDown={onFieldKeyDown}
    />
  </label>
);

export { RenameManyField };
