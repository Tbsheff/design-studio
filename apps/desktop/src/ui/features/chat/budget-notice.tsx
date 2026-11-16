import { Icon } from "@design-studio/ui";
import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { openProjectSettings, toLimitText } from "./run-notice-model.js";
import type { RunView } from "./run-state-model.js";

const ALERT_ICON_SIZE = 14;

const BudgetNotice = ({
  run,
  latest,
  onRetry,
}: {
  run: RunView;
  latest: boolean;
  onRetry: (() => void) | null;
}): ReactElement => (
  <output className="ui-notice run-notice" data-testid="budget-notice">
    <Icon name="alert" size={ALERT_ICON_SIZE} />
    <span className="run-notice-text">{toLimitText(run)}</span>
    {latest && (
      <span className="run-notice-actions">
        <button
          type="button"
          className="btn small run-raise-limit"
          data-tip={copy.raiseLimitTip}
          data-tip-side="top"
          onClick={openProjectSettings}
        >
          {copy.raiseLimit}
        </button>
        {onRetry && (
          <button
            type="button"
            className="btn ghost small run-retry"
            onClick={onRetry}
          >
            {copy.retry2}
          </button>
        )}
      </span>
    )}
  </output>
);

export { BudgetNotice };
