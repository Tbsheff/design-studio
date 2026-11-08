import type {
  DesignRule,
  DesignRuleHit,
  DesignRulesTestResult,
} from "@design-studio/contracts/design-rules";
import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { RuleRow } from "./rule-row.js";
import { toFrameText } from "./rules-model.js";

interface Props {
  hits: ReadonlyMap<string, DesignRuleHit>;
  result: DesignRulesTestResult | null;
  rules: readonly DesignRule[];
}

const RulesEditorResult = ({ hits, result, rules }: Props): ReactElement => (
  <>
    {result && <p className="pane-system-text">{toFrameText(result)}</p>}
    {result?.notes.map((line) => (
      <p key={line} className="pane-system-text">
        {line}
      </p>
    ))}
    {rules.length > 0 && (
      <ul className="rules-list" aria-label={copy.parsedRules}>
        {rules.map((rule) => (
          <RuleRow key={rule.id} rule={rule} hit={hits.get(rule.id)} />
        ))}
      </ul>
    )}
  </>
);

export { RulesEditorResult };
