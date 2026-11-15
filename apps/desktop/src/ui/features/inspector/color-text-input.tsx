import type { ReactElement } from "react";

import type { ColorTextField } from "./use-color-text.js";

import styles from "./color-popup.module.css";

const ColorTextInput = ({
  label,
  field,
}: {
  readonly label: string;
  readonly field: ColorTextField;
}): ReactElement => (
  <label className={styles.field}>
    <span className={styles.fieldLabel}>{label}</span>
    <input
      className={styles.fieldInput}
      aria-label={label}
      value={field.text}
      spellCheck={false}
      autoComplete="off"
      onChange={field.handleChange}
      onKeyDown={field.handleKeyDown}
      onBlur={field.handleBlur}
    />
  </label>
);

export { ColorTextInput };
