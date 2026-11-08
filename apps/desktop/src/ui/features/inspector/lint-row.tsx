import { useCallback } from "react";
import type { ReactElement } from "react";

import { copy } from "./copy.js";
import type { LintIssue } from "./deps.js";
import { LintText } from "./lint-text.js";
import { toPropsLabel, toUseTokenLabel } from "./token-lint-model.js";

const LintRow = ({
  issue,
  onApply,
}: {
  readonly issue: LintIssue;
  readonly onApply: (issue: LintIssue) => void;
}): ReactElement => {
  const label = toPropsLabel(issue.props);
  const handleApply = useCallback(() => onApply(issue), [issue, onApply]);

  return (
    <li className="tk-lint-row" data-testid="token-lint">
      <LintText issue={issue} label={label} />
      <button
        type="button"
        className="btn small"
        aria-label={toUseTokenLabel(issue, label)}
        onClick={handleApply}
      >
        {copy.applyToken}
      </button>
    </li>
  );
};

export { LintRow };
