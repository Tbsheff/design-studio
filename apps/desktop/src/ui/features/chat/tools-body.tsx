import type { ReactElement } from "react";

import type { RunView } from "./run-state-model.js";
import { ToolRow } from "./tool-row.js";

const ToolsBody = ({
  tools,
  hasErrorColumn,
}: {
  tools: RunView["tools"];
  hasErrorColumn: boolean;
}): ReactElement => (
  <tbody>
    {tools.map((tool) => (
      <ToolRow
        key={tool.toolUseId}
        tool={tool}
        hasErrorColumn={hasErrorColumn}
      />
    ))}
  </tbody>
);

export { ToolsBody };
