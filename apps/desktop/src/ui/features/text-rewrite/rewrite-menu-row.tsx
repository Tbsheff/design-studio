import { useCallback } from "react";
import type { ReactElement } from "react";

import styles from "./text-rewrite.module.css";

interface RewriteMenuRowProps<Value extends string> {
  readonly label: string;
  readonly onPick: (value: Value) => void;
  readonly value: Value;
}

const RewriteMenuRow = <Value extends string>({
  label,
  onPick,
  value,
}: RewriteMenuRowProps<Value>): ReactElement => {
  const handlePick = useCallback((): void => {
    onPick(value);
  }, [onPick, value]);

  return (
    <button
      className={styles.row}
      role="menuitem"
      type="button"
      onClick={handlePick}
    >
      {label}
    </button>
  );
};

export { RewriteMenuRow };
