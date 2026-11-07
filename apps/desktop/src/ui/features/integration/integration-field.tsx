import type { ChangeEvent, ReactElement } from "react";

import styles from "./integration.module.css";

interface IntegrationFieldProps {
  readonly isInvalid: boolean;
  readonly label: string;
  readonly name: string;
  readonly onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  readonly placeholder: string;
  readonly type: "password" | "text";
  readonly value: string;
}

const IntegrationField = ({
  isInvalid,
  label,
  name,
  onChange,
  placeholder,
  type,
  value,
}: IntegrationFieldProps): ReactElement => (
  <label className={styles.field}>
    {label}
    <input
      aria-invalid={isInvalid}
      autoComplete="off"
      className={styles.input}
      name={name}
      onChange={onChange}
      placeholder={placeholder}
      spellCheck={false}
      type={type}
      value={value}
    />
  </label>
);

export { IntegrationField };
