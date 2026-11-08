import type { ChangeEvent, ReactElement } from "react";

import { copy } from "./copy.js";

import styles from "./screen.module.css";

interface ScreenTitleFieldProps {
  readonly onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  readonly value: string;
}

const ScreenTitleField = ({
  onChange,
  value,
}: ScreenTitleFieldProps): ReactElement => (
  <label className="field">
    <span className={styles.fieldLabel}>{copy.titleLabel}</span>
    <input
      onChange={onChange}
      placeholder={copy.titlePlaceholder}
      value={value}
    />
  </label>
);

export { ScreenTitleField };
