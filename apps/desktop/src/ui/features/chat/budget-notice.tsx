import { Icon } from "@design-studio/ui";
import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { toLimitText } from "./run-notice-model.js";
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
    {latest && onRetry && (
      <button
        type="button"
        className="btn ghost small run-retry"
        onClick={onRetry}
      >
        {copy.retry2}
      </button>
    )}
  </output>
);

export { BudgetNotice };
