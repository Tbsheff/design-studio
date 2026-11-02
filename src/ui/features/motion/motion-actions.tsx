import { useCallback } from "react";
import type { ReactElement } from "react";

import { copy } from "./copy.js";

import styles from "./motion.module.css";

interface MotionActionsProps {
  readonly busy: boolean;
  readonly canPreview: boolean;
  readonly disabled: boolean;
  readonly onApply: () => Promise<void>;
  readonly onPreview: () => void;
}

const applyLabel = (busy: boolean): string => {
  if (busy) {
    return copy.applying;
  }

  return copy.apply;
};

const MotionActions = ({
  busy,
  canPreview,
  disabled,
  onApply,
  onPreview,
}: MotionActionsProps): ReactElement => {
  const handleApply = useCallback((): void => {
    void onApply();
  }, [onApply]);

  return (
    <div className={styles.actions}>
      <button
        aria-label={copy.previewLabel}
        className="btn small ghost"
        disabled={disabled || !canPreview}
        type="button"
        onClick={onPreview}
      >
        {copy.preview}
      </button>
      <button
        className="btn small"
        disabled={disabled}
        type="button"
        onClick={handleApply}
      >
        {applyLabel(busy)}
      </button>
    </div>
  );
};

export { MotionActions };
