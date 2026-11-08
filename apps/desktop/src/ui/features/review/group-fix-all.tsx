import type { ReviewFinding } from "@design-studio/contracts/review";
import { useCallback } from "react";
import type { ReactElement } from "react";

import { copy } from "./copy.js";
import type { ReviewActions } from "./review-model.js";

interface GroupFixAllProps {
  readonly fixable: readonly ReviewFinding[];
  readonly actions: ReviewActions;
}

const GroupFixAll = ({ actions, fixable }: GroupFixAllProps): ReactElement => {
  const { onFix } = actions;

  const fixAll = useCallback((): void => {
    onFix([...fixable]);
  }, [fixable, onFix]);

  return (
    <button
      type="button"
      className="btn small"
      disabled={actions.fixBlocked !== null || actions.fixing !== null}
      data-tip={
        actions.fixBlocked ??
        `${copy.applyFixes} ${fixable.length} ${copy.fixesOneVersion}`
      }
      data-tip-align="end"
      onClick={fixAll}
    >
      {`${copy.fixAll}${fixable.length}`}
    </button>
  );
};

export { GroupFixAll };
