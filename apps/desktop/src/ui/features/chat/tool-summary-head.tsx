import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { toPlural } from "./plural-model.js";
import { ToolSummaryCaret } from "./tool-summary-caret.js";
import { ToolSummaryIcon } from "./tool-summary-icon.js";

const ToolSummaryHead = ({
  count,
  failedCount,
  isOpen,
  label,
  onToggle,
}: {
  count: number;
  failedCount: number;
  isOpen: boolean;
  label: string;
  onToggle: () => void;
}): ReactElement => (
  <button
    type="button"
    className="tool-summary-head"
    aria-expanded={isOpen}
    data-tip={label}
    onClick={onToggle}
  >
    <ToolSummaryIcon />
    <span className="tool-summary-count tabular-nums">
      {count}
      {copy.step}
      {toPlural(count)}
    </span>
    <span className="tool-summary-label">{label}</span>
    {failedCount > 0 && (
      <span className="tool-summary-failed">
        {failedCount}
        {copy.failed2}
      </span>
    )}
    <ToolSummaryCaret />
  </button>
);

export { ToolSummaryHead };
