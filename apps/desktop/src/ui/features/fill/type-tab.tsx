import { useCallback } from "react";
import type { ReactElement } from "react";

import { TYPE_LABELS } from "./copy.js";
import type { FillType } from "./deps.js";

import styles from "./fill.module.css";

interface TypeTabProps {
  readonly checked: boolean;
  readonly disabled: boolean;
  readonly type: FillType;
  readonly onPick: (type: FillType) => void;
}

const TypeTab = ({
  checked,
  disabled,
  type,
  onPick,
}: TypeTabProps): ReactElement => {
  const handlePick = useCallback((): void => {
    onPick(type);
  }, [onPick, type]);

  return (
    <button
      aria-pressed={checked}
      className={styles.tab}
      disabled={disabled}
      type="button"
      onClick={handlePick}
    >
      {TYPE_LABELS[type]}
    </button>
  );
};

export { TypeTab };
