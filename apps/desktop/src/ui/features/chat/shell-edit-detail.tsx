import type { ToolDiff } from "@design-studio/contracts";
import type { ReactElement } from "react";

import type { ToolRow } from "./run-state-model.js";
import { ShellEditFile } from "./shell-edit-file.js";

const ShellEditDetail = ({
  tool,
  diffs,
}: {
  tool: ToolRow;
  diffs: ToolDiff[];
}): ReactElement => (
  <div className="flex min-w-0 flex-col gap-2 text-xs">
    {tool.summary && (
      <span className="font-mono break-all text-muted-foreground">
        {tool.summary}
      </span>
    )}
    {diffs.map((diff) => (
      <ShellEditFile key={diff.path} diff={diff} />
    ))}
  </div>
);

export { ShellEditDetail };
