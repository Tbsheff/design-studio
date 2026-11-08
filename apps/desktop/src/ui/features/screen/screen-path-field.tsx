import { useEffect, useRef } from "react";
import type { ChangeEvent, ReactElement } from "react";

import { copy } from "./copy.js";

import styles from "./screen.module.css";

interface ScreenPathFieldProps {
  readonly isTaken: boolean;
  readonly label: string;
  readonly onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  readonly value: string;
}

const ScreenPathField = ({
  isTaken,
  label,
  onChange,
  value,
}: ScreenPathFieldProps): ReactElement => {
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    input.current?.focus();
  }, []);

  return (
    <label className="field">
      <span className={styles.fieldLabel}>{label}</span>
      <input
        aria-invalid={isTaken}
        className={`mono ${styles.pathInput}`}
        onChange={onChange}
        placeholder={copy.pathPlaceholder}
        ref={input}
        spellCheck={false}
        value={value}
      />
    </label>
  );
};

export { ScreenPathField };
