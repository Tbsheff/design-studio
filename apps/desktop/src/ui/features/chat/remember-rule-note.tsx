import type { ReactElement } from "react";

import { copy } from "./copy.js";
import type { RememberRule } from "./use-remember-rule.js";

const RememberRuleNote = ({
  rule,
}: {
  rule: RememberRule;
}): ReactElement | null => {
  if (rule.error !== null) {
    return (
      <p className="remember-rule-note remember-rule-error" role="alert">
        {rule.error}
      </p>
    );
  }

  if (rule.saved === null) {
    return null;
  }

  return (
    <output className="remember-rule-note">
      <span className="remember-rule-label">{copy.ruleSaved}</span>
      <code className="remember-rule-line">{rule.saved.line}</code>
      {!rule.saved.isChecked && (
        <span className="remember-rule-hint">{copy.ruleAgentOnly}</span>
      )}
      <button
        type="button"
        className="remember-rule-link"
        onClick={rule.handleOpenRules}
      >
        {copy.openRules}
      </button>
    </output>
  );
};

export { RememberRuleNote };
