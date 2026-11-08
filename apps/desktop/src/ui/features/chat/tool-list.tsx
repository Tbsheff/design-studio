import type { ReactElement } from "react";

import type { ToolRow } from "./run-state-model.js";
import { ToolItem } from "./tool-item.js";
import { groupRepeats } from "./tool-rows-model.js";

const ToolList = ({
  tools,
  running,
  workTree,
}: {
  tools: ToolRow[];
  running: boolean;
  workTree: string | null;
}): ReactElement => (
  <div className="tool-list flex flex-col">
    {groupRepeats(tools, workTree).map((group) => (
      <ToolItem
        key={group.tool.toolUseId}
        group={group}
        workTree={workTree}
        running={running}
      />
    ))}
  </div>
);

export { ToolList };
