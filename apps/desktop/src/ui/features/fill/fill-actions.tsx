import type { ReactElement } from "react";

import { copy } from "./copy.js";

import styles from "./fill.module.css";

interface FillActionsProps {
  readonly pending: boolean;
  readonly onApply: () => void;
  readonly onReset: () => void;
}

const applyText = (pending: boolean): string => {
  if (pending) {
    return copy.applying;
  }

  return copy.apply;
};

const FillActions = ({
  pending,
  onApply,
  onReset,
}: FillActionsProps): ReactElement => (
  <div className={styles.actions}>
    <button
      aria-label={copy.resetLabel}
      className="btn small ghost"
      disabled={pending}
      type="button"
      onClick={onReset}
    >
      {copy.reset}
    </button>
    <button
      className="btn small"
      disabled={pending}
      type="button"
      onClick={onApply}
    >
      {applyText(pending)}
    </button>
  </div>
);

export { FillActions };
