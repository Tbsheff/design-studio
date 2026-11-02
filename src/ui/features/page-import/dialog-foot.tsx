import type { ReactElement } from "react";

import { STEP_TEXT, copy } from "./copy.js";
import type { PageImportState } from "./use-page-import.js";

import styles from "./page-import.module.css";

interface DialogFootProps {
  readonly formId: string;
  readonly onClose: () => void;
  readonly state: PageImportState;
}

const DialogFoot = ({
  formId,
  onClose,
  state,
}: DialogFootProps): ReactElement => {
  let label: string = copy.import;

  if (state.isPending) {
    label = copy.importing;
  }

  return (
    <footer className={styles.foot}>
      <output className={styles.status} aria-live="polite">
        {state.isPending && STEP_TEXT[state.step]}
      </output>
      {state.error !== null && (
        <p className={styles.problem} role="alert">
          {state.error}
        </p>
      )}
      <button
        type="button"
        className="btn small"
        disabled={state.isPending}
        onClick={onClose}
      >
        {copy.cancel}
      </button>
      <button
        type="submit"
        form={formId}
        className="btn small primary"
        disabled={!state.isUrlOk || state.isPending}
      >
        {label}
      </button>
    </footer>
  );
};

export { DialogFoot };
