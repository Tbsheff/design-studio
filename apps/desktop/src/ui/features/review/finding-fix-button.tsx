import type { ReviewFinding } from "@design-studio/contracts/review";
import { Icon } from "@design-studio/ui";
import { useCallback } from "react";
import type { ReactElement } from "react";

import type { ReviewActions } from "./review-model.js";
import { toFixTip } from "./review-model.js";

interface FindingFixButtonProps {
  readonly finding: ReviewFinding;
  readonly label: string;
  readonly actions: ReviewActions;
}

const FindingFixButton = ({
  actions,
  finding,
  label,
}: FindingFixButtonProps): ReactElement => {
  const { onFix } = actions;
  const isBusy = actions.fixing?.includes(finding.id) ?? false;

  const fixFinding = useCallback((): void => {
    onFix([finding]);
  }, [finding, onFix]);

  return (
    <button
      type="button"
      className="btn small"
      disabled={actions.fixBlocked !== null || actions.fixing !== null}
      data-tip={actions.fixBlocked ?? toFixTip(finding)}
      data-tip-align="end"
      onClick={fixFinding}
    >
      {isBusy && <span className="spinner" />}
      {!isBusy && <Icon name="check" size={12} />}
      <span>{label}</span>
    </button>
  );
};

export { FindingFixButton };
