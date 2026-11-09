import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { TurnButton } from "./turn-button.js";
import type { RememberRule } from "./use-remember-rule.js";

const toRememberTip = (isPending: boolean): string | null => {
  if (isPending) {
    return copy.rememberingRule;
  }

  return null;
};

const RememberRuleButton = ({
  rule,
}: {
  rule: RememberRule;
}): ReactElement | null => {
  if (!rule.canRemember) {
    return null;
  }

  return (
    <span className="msg-remember-slot">
      <TurnButton
        icon="book"
        label={copy.rememberRule}
        tip={toRememberTip(rule.isPending)}
        onClick={rule.handleRemember}
      />
    </span>
  );
};

export { RememberRuleButton };
