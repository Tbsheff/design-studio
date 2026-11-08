import type { ReactElement } from "react";

import { formatMs } from "../../domain/format.js";
import { copy } from "./copy.js";
import { toPlural } from "./plural-model.js";
import type { ToolRow } from "./run-state-model.js";
import { failed } from "./tool-chips-model.js";

const GroupSummary = ({ tools }: { tools: ToolRow[] }): ReactElement => {
  const errors = tools.filter((tool) => failed(tool)).length;
  let total = 0;

  for (const tool of tools) {
    total += tool.durationMs ?? 0;
  }

  return (
    <>
      <span>
        {tools.length}
        {copy.toolCall}
        {toPlural(tools.length)}
      </span>
      {errors > 0 && (
        <span className="text-destructive">
          {errors}
          {copy.failed2}
        </span>
      )}
      {total > 0 && <span className="tabular-nums">{formatMs(total)}</span>}
    </>
  );
};

export { GroupSummary };
