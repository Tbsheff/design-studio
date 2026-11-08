import { Icon } from "@design-studio/ui";
import type { ReactElement } from "react";

const TOOL_ICON_SIZE = 14;

const ToolSummaryIcon = (): ReactElement => (
  <span className="tool-summary-icon" aria-hidden="true">
    <Icon name="sparkle" size={TOOL_ICON_SIZE} />
  </span>
);

export { ToolSummaryIcon };
