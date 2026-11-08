import { Icon } from "@design-studio/ui";
import type { ReactElement } from "react";

import type { AuthoredCss } from "./authored-css-model.js";
import { copy } from "./copy.js";
import { LintRow } from "./lint-row.js";
import { LINT_SHOWN, toHeadText, toMoreText } from "./token-lint-model.js";
import type { DirectEdit } from "./use-direct-edit.js";
import { useTokenLint } from "./use-token-lint.js";
import type { TokenUi } from "./use-token-snap.js";

const TokenLint = ({
  ui,
  edit,
  css,
}: {
  readonly ui: TokenUi | null;
  readonly edit: DirectEdit;
  readonly css: AuthoredCss | null;
}): ReactElement | null => {
  const { isAll, issues, shown, toggle, applyIssue } = useTokenLint(
    ui,
    edit,
    css
  );

  if (!ui || issues.length === 0) {
    return null;
  }

  return (
    <section className="tk-lint" aria-label={copy.tokenChecks}>
      <h3 className="tk-lint-head">
        <Icon name="alert" size={13} />
        {toHeadText(issues.length)}
      </h3>
      <ul className="tk-lint-list">
        {shown.map((issue) => (
          <LintRow
            key={issue.props.join(",")}
            issue={issue}
            onApply={applyIssue}
          />
        ))}
      </ul>
      {issues.length > LINT_SHOWN && (
        <button
          type="button"
          className="tk-lint-more"
          aria-expanded={isAll}
          onClick={toggle}
        >
          {toMoreText(isAll, issues.length)}
        </button>
      )}
    </section>
  );
};

export { TokenLint };
