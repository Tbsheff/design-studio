import type { ReactElement } from "react";

import { ChainOfThoughtHeader } from "../../ai/components/ai/chain-of-thought-header.js";
import { GroupSummary } from "./group-summary.js";
import type { ToolRow } from "./run-state-model.js";
import { toStyled } from "./styled.js";
import { ToolChainIcon } from "./tool-chain-icon.js";

const Header = toStyled(ChainOfThoughtHeader, "tools-toggle text-xs");

const ToolChainHeader = ({ tools }: { tools: ToolRow[] }): ReactElement => (
  <Header>
    <ToolChainIcon />
    <GroupSummary tools={tools} />
  </Header>
);

export { ToolChainHeader };
