import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { useDecisionOther } from "./use-decision-row.js";

import styles from "./decision-row.module.css";

const DecisionRowOther = ({
  onSubmit,
  onCancel,
}: {
  readonly onSubmit: (option: string) => void;
  readonly onCancel: () => void;
}): ReactElement => {
  const other = useDecisionOther(onSubmit, onCancel);

  return (
    <div className={styles.other}>
      <input
        className={styles.otherInput}
        value={other.value}
        placeholder={copy.decisionOtherPlaceholder}
        aria-label={copy.decisionOtherLabel}
        maxLength={200}
        onChange={other.handleChange}
        onKeyDown={other.handleKeyDown}
      />
      <button
        type="button"
        className="btn small primary"
        onClick={other.handleSubmit}
      >
        {copy.decisionUse}
      </button>
    </div>
  );
};

export { DecisionRowOther };
