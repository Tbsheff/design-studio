import { Icon } from "@design-studio/ui";
import type { IconName } from "@design-studio/ui";
import type { ReactElement } from "react";

import type { ToolRow } from "./run-state-model.js";
import type { ToolState } from "./tool-chips-model.js";

const ICON_SIZE = 14;

const TOOL_ICON = new Map<string, IconName>([
  ["Bash", "terminal"],
  ["Edit", "pencil"],
  ["Glob", "search"],
  ["Grep", "search"],
  ["MultiEdit", "pencil"],
  ["Read", "file"],
  ["Skill", "book"],
  ["TodoWrite", "check"],
  ["WebFetch", "globe"],
  ["Write", "pencil"],
]);

const toIconName = (tool: ToolRow, state: ToolState): IconName => {
  if (state === "error") {
    return "alert";
  }

  return TOOL_ICON.get(tool.name) ?? "code";
};

const ToolStateIcon = ({
  tool,
  state,
}: {
  tool: ToolRow;
  state: ToolState;
}): ReactElement => {
  if (state === "pending") {
    return <span className="spinner" />;
  }

  if (state === "stopped" || state === "denied") {
    return <Icon name="close" size={ICON_SIZE} />;
  }

  return <Icon name={toIconName(tool, state)} size={ICON_SIZE} />;
};

export { ToolStateIcon };
