import { useCallback, useMemo, useState } from "react";

import type { AuthoredCss } from "./authored-css-model.js";
import { lintValues } from "./deps.js";
import type { LintIssue } from "./deps.js";
import { LINT_SHOWN } from "./token-lint-model.js";
import type { DirectEdit } from "./use-direct-edit.js";
import type { TokenUi } from "./use-token-snap.js";

interface TokenLintState {
  readonly issues: LintIssue[];
  readonly isAll: boolean;
  readonly shown: LintIssue[];
  readonly toggle: () => void;
  readonly applyIssue: (issue: LintIssue) => void;
}

const useTokenLint = (
  ui: TokenUi | null,
  edit: DirectEdit,
  css: AuthoredCss | null
): TokenLintState => {
  const issues = useMemo(() => {
    if (!ui) {
      return [];
    }

    return lintValues(edit.values, ui.entries, ui.mode, {
      css,
      dirty: edit.dirty,
    });
  }, [ui, edit.values, edit.dirty, css]);

  const [isAll, setIsAll] = useState(false);
  const toggle = useCallback(() => setIsAll((current) => !current), []);

  const applyIssue = useCallback(
    (issue: LintIssue): void => {
      edit.preview(
        Object.fromEntries(
          issue.props.map((part) => [part, `var(${issue.token.cssVar})`])
        )
      );
      edit.commit();
    },
    [edit]
  );

  let shown = issues.slice(0, LINT_SHOWN);

  if (isAll) {
    shown = issues;
  }

  return { applyIssue, isAll, issues, shown, toggle };
};

export type { TokenLintState };

export { useTokenLint };
