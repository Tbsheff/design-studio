import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { FixList } from "./fix-list.js";
import type { FixView } from "./use-fix.js";

import styles from "./viewport.module.css";

interface FixSectionProps {
  readonly fix: FixView;
}

const FixSection = ({ fix }: FixSectionProps): ReactElement => {
  const { result } = fix;

  return (
    <>
      <span className={styles.label}>{copy.fix.scope}</span>
      <div className={styles.actions}>
        <button
          className={styles.secondary}
          disabled={!fix.canFix || fix.isBusy}
          onClick={fix.handlePreview}
          type="button"
        >
          {copy.fix.action}
        </button>
        {result !== null && !fix.isSaved && result.applied.length > 0 && (
          <button
            className={styles.primary}
            disabled={fix.isBusy}
            onClick={fix.handleApply}
            type="button"
          >
            {copy.fix.apply}
          </button>
        )}
      </div>
      <span className={styles.error} role="alert">
        {fix.error}
      </span>
      {result !== null && <FixList isSaved={fix.isSaved} result={result} />}
    </>
  );
};

export { FixSection };
