import type { ReactElement } from "react";

import { formatMs } from "../../domain/format.js";
import { copy } from "./copy.js";
import type { RunView } from "./run-state-model.js";
import {
  SKILL_TOOL,
  prettyToolName,
  skillToolName,
  toolTarget,
} from "./tool-labels-model.js";

type RunTool = RunView["tools"][number];

const toToolInput = (tool: RunTool): string => {
  if (tool.name === SKILL_TOOL) {
    return skillToolName(tool.input);
  }

  return toolTarget(tool.input, null);
};

const toToolTime = (tool: RunTool): string => {
  if (tool.durationMs === null) {
    return "Running…";
  }

  return formatMs(tool.durationMs);
};

const ToolRow = ({
  tool,
  hasErrorColumn,
}: {
  tool: RunTool;
  hasErrorColumn: boolean;
}): ReactElement => (
  <tr data-tip={JSON.stringify(tool.input)}>
    <td className="truncate">{prettyToolName(tool.name)}</td>
    <td className="mono truncate">{toToolInput(tool)}</td>
    <td className="num">{toToolTime(tool)}</td>
    {hasErrorColumn && (
      <td>
        {tool.isError && <span className="badge fail">{copy.error}</span>}
      </td>
    )}
  </tr>
);

export { ToolRow };
