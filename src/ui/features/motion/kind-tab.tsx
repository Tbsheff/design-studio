import { useCallback } from "react";
import type { ReactElement } from "react";

import { KIND_LABELS } from "./copy.js";
import type { MotionKind } from "./deps.js";

import styles from "./motion.module.css";

interface KindTabProps {
  readonly checked: boolean;
  readonly disabled: boolean;
  readonly kind: MotionKind;
  readonly onPick: (kind: MotionKind) => void;
}

const KindTab = ({
  checked,
  disabled,
  kind,
  onPick,
}: KindTabProps): ReactElement => {
  const handlePick = useCallback((): void => {
    onPick(kind);
  }, [kind, onPick]);

  return (
    <button
      aria-pressed={checked}
      className={styles.tab}
      disabled={disabled}
      type="button"
      onClick={handlePick}
    >
      {KIND_LABELS[kind]}
    </button>
  );
};

export { KindTab };
