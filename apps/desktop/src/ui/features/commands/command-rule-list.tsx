import type { ReactElement } from "react";

import { CommandRuleRow } from "./command-rule-row.js";
import { copy } from "./copy.js";

const CommandRuleList = ({
  isPending,
  onRemove,
  rules,
}: {
  isPending: boolean;
  onRemove: (rule: string) => void;
  rules: string[];
}): ReactElement => {
  if (rules.length === 0) {
    return (
      <p className="command-rules-empty">{copy.textNoCommandsAreAlways}</p>
    );
  }

  return (
    <ul>
      {rules.map((rule) => (
        <CommandRuleRow
          key={rule}
          isPending={isPending}
          onRemove={onRemove}
          rule={rule}
        />
      ))}
    </ul>
  );
};

export { CommandRuleList };
