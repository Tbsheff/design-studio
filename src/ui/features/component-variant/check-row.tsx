import { useId } from "react";
import type { ReactElement } from "react";

import styles from "./component-variant.module.css";

interface CheckRowProps {
  readonly checked: boolean;
  readonly disabled: boolean;
  readonly label: string;
  readonly onToggle: () => void;
}

const CheckRow = (props: CheckRowProps): ReactElement => {
  const id = useId();

  return (
    <div className={styles.check}>
      <input
        id={id}
        type="checkbox"
        checked={props.checked}
        disabled={props.disabled}
        onChange={props.onToggle}
      />
      <label htmlFor={id}>{props.label}</label>
    </div>
  );
};

export { CheckRow };
