import type { ReactElement } from "react";

import { copy } from "./copy.js";
import type { RunView } from "./run-state-model.js";
import { ToolsBody } from "./tools-body.js";
import { ToolsColgroup } from "./tools-colgroup.js";
import { ToolsHead } from "./tools-head.js";

const ToolsTable = ({ tools }: { tools: RunView["tools"] }): ReactElement => {
  const hasErrorColumn = tools.some((tool) => tool.isError);

  return (
    <div className="tools-table">
      <table className="table compact" aria-label={copy.toolCallsTable}>
        <ToolsColgroup hasErrorColumn={hasErrorColumn} />
        <ToolsHead hasErrorColumn={hasErrorColumn} />
        <ToolsBody tools={tools} hasErrorColumn={hasErrorColumn} />
      </table>
    </div>
  );
};

export { ToolsTable };
