import { Icon } from "@design-studio/ui";
import type { ReactElement } from "react";

import { ChainOfThoughtIcon } from "../../ai/components/ai/chain-of-thought-icon.js";

const TOOL_ICON_SIZE = 14;

const ToolChainIcon = (): ReactElement => (
  <ChainOfThoughtIcon>
    <Icon name="terminal" size={TOOL_ICON_SIZE} />
  </ChainOfThoughtIcon>
);

export { ToolChainIcon };
