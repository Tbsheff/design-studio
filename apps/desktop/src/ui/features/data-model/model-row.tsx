import { useCallback } from "react";
import type { ReactElement } from "react";

import { copy } from "./copy.js";

import styles from "./data-model.module.css";

interface ModelRowProps {
  readonly isSelected: boolean;
  readonly kind: "enum" | "model";
  readonly name: string;
  readonly onPick: (name: string) => void;
}

const ModelRow = ({
  isSelected,
  kind,
  name,
  onPick,
}: ModelRowProps): ReactElement => {
  const handlePick = useCallback((): void => {
    onPick(name);
  }, [name, onPick]);

  return (
    <li>
      <button
        type="button"
        className={styles.row}
        aria-pressed={isSelected}
        onClick={handlePick}
      >
        <span className={styles.rowName}>{name}</span>
        <span className={styles.rowKind}>{copy.kinds[kind]}</span>
      </button>
    </li>
  );
};

export { ModelRow };
