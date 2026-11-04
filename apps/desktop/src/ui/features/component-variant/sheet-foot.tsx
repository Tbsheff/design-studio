import type { ReactElement } from "react";

import { copy } from "./copy.js";
import type { VariantDraftState } from "./use-variant-draft.js";

import styles from "./component-variant.module.css";

interface SheetFootProps {
  readonly onClose: () => void;
  readonly state: VariantDraftState;
}

const SheetFoot = ({ onClose, state }: SheetFootProps): ReactElement => {
  let label: string = copy.save;

  if (state.isPending) {
    label = copy.saving;
  }

  return (
    <footer className={styles.foot}>
      {state.error !== null && (
        <p className={styles.problem} role="alert">
          {state.error}
        </p>
      )}
      <button type="button" className="btn small" onClick={onClose}>
        {copy.cancel}
      </button>
      <button
        type="button"
        className="btn small primary"
        disabled={state.change === null || state.isPending}
        onClick={state.handleSave}
      >
        {label}
      </button>
    </footer>
  );
};

export { SheetFoot };
