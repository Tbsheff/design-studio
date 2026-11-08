import type { ReactElement } from "react";

import type { LintIssue } from "./deps.js";
import { LintIssueHint } from "./lint-issue-hint.js";
import { toShownValue } from "./token-lint-model.js";

const LintText = ({
  issue,
  label,
}: {
  readonly issue: LintIssue;
  readonly label: string;
}): ReactElement => (
  <span className="tk-lint-text">
    <span className="tk-lint-prop">
      {label} <span className="tk-lint-value">{toShownValue(issue)}</span>
    </span>
    <span className="tk-lint-hint">
      <LintIssueHint issue={issue} />
    </span>
  </span>
);

export { LintText };
