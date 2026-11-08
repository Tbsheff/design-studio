import type { ReviewFinding } from "@design-studio/contracts/review";
import type { ReactElement } from "react";

import { FindingAskButton } from "./finding-ask-button.js";
import { FindingFixButton } from "./finding-fix-button.js";
import { FindingTarget } from "./finding-target.js";
import type { ReviewActions } from "./review-model.js";

interface FindingRowProps {
  readonly finding: ReviewFinding;
  readonly actions: ReviewActions;
}

const FindingRow = ({ actions, finding }: FindingRowProps): ReactElement => {
  const { onAsk, onSelect } = actions;

  return (
    <li className="review-row">
      <FindingTarget finding={finding} onSelect={onSelect} />
      <p className="review-msg">{finding.message}</p>
      <div className="review-actions">
        {finding.source && (
          <code className="review-src truncate">{finding.source}</code>
        )}
        {finding.fix && (
          <FindingFixButton
            finding={finding}
            label={finding.fix.label}
            actions={actions}
          />
        )}
        {!finding.fix && (
          <FindingAskButton
            finding={finding}
            canAsk={actions.canAsk}
            onAsk={onAsk}
          />
        )}
      </div>
    </li>
  );
};

export { FindingRow };
