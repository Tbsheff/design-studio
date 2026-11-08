import { DESIGN_RULE_KIND_LABEL } from "@design-studio/contracts/design-rules";
import type {
  DesignRule,
  DesignRuleHit,
} from "@design-studio/contracts/design-rules";
import type { ReactElement } from "react";

import { toHitText, toHitTip, toRuleTone } from "./rules-model.js";

interface Props {
  rule: DesignRule;
  hit: DesignRuleHit | undefined;
}

const RuleRow = ({ hit, rule }: Props): ReactElement => (
  <li
    className="rules-row"
    data-tone={toRuleTone(rule, hit)}
    data-tip={toHitTip(rule, hit)}
  >
    <span className="ui-chip rules-kind">
      {DESIGN_RULE_KIND_LABEL[rule.kind]}
    </span>
    <span className="rules-text">{rule.text}</span>
    <span className="rules-hits">{toHitText(rule, hit)}</span>
  </li>
);

export { RuleRow };
