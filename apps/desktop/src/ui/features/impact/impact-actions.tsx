import type { ReactElement } from "react";

import { copy } from "./copy.js";

import styles from "./impact.module.css";

interface ImpactActionsProps {
  readonly canCompare: boolean;
  readonly hasFile: boolean;
  readonly isBusy: boolean;
  readonly isSaved: boolean;
  readonly onBaseline: () => void;
  readonly onCompare: () => void;
}

const ImpactActions = (props: ImpactActionsProps): ReactElement => {
  const { canCompare, hasFile, isBusy, isSaved, onBaseline, onCompare } = props;

  return (
    <div className={styles.actions}>
      <button
        className="btn small"
        data-tip={copy.baselineTip}
        data-tip-align="start"
        disabled={isBusy || !hasFile}
        onClick={onBaseline}
        type="button"
      >
        {copy.baselineAction}
      </button>
      <button
        className="btn small"
        data-tip={copy.compareTip}
        data-tip-align="start"
        disabled={isBusy || !canCompare}
        onClick={onCompare}
        type="button"
      >
        {copy.compareAction}
      </button>
      {isBusy && <span className="spinner" />}
      {isBusy && <span className={styles.note}>{copy.running}</span>}
      {!isBusy && isSaved && (
        <span className={styles.note}>{copy.savedNote}</span>
      )}
    </div>
  );
};

export { ImpactActions };
