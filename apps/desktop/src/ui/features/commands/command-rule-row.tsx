import type { ReactElement } from "react";
import { useCallback } from "react";

import { copy } from "./copy.js";

const CommandRuleRow = ({
  isPending,
  onRemove,
  rule,
}: {
  isPending: boolean;
  onRemove: (rule: string) => void;
  rule: string;
}): ReactElement => {
  const removeThis = useCallback(() => onRemove(rule), [onRemove, rule]);

  return (
    <li>
      <code>{rule}</code>
      <button
        type="button"
        className="btn small"
        disabled={isPending}
        aria-label={`Remove ${rule}`}
        onClick={removeThis}
      >
        {copy.textRemove}
      </button>
    </li>
  );
};

export { CommandRuleRow };
