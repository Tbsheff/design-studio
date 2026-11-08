import type { ReactElement } from "react";

import { DiffView } from "./diff-view.js";
import type { ToolRow } from "./run-state-model.js";
import { ShellEditDetail } from "./shell-edit-detail.js";
import type { ToolState } from "./tool-chips-model.js";
import { shellEdits } from "./tool-rows-model.js";

const toDetailText = (tool: ToolRow, state: ToolState): string => {
  if (tool.summary) {
    return tool.summary;
  }

  if (state === "pending") {
    return "Running";
  }

  return "";
};

const toDetailClass = (state: ToolState): string => {
  if (state === "error") {
    return "text-destructive wrap-anywhere";
  }

  return "wrap-anywhere";
};

const ToolDetail = ({
  tool,
  target,
  state,
}: {
  tool: ToolRow;
  target: string;
  state: ToolState;
}): ReactElement => {
  if (tool.diff) {
    return <DiffView diff={tool.diff} />;
  }

  const edits = shellEdits(tool);

  if (edits.length > 0) {
    return <ShellEditDetail tool={tool} diffs={edits} />;
  }

  const detail = toDetailText(tool, state);

  return (
    <div className="flex flex-col gap-1 text-xs">
      {target && (
        <span className="font-mono break-all text-foreground">{target}</span>
      )}
      {detail && <span className={toDetailClass(state)}>{detail}</span>}
    </div>
  );
};

export { ToolDetail };
