import { Icon } from "@design-studio/ui";
import type { ReactElement } from "react";

const TOOL_ICON_SIZE = 14;

const ToolSummaryCaret = (): ReactElement => (
  <span className="tool-summary-caret">
    <Icon name="chevronDown" size={TOOL_ICON_SIZE} />
  </span>
);

export { ToolSummaryCaret };
