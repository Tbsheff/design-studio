import { useCallback, useState } from "react";
import type { ReactElement } from "react";

import { ChainOfThought } from "../../ai/components/ai/chain-of-thought.js";
import type { ToolRow } from "./run-state-model.js";
import { toStyled } from "./styled.js";
import { ToolChainContent } from "./tool-chain-content.js";
import { ToolChainHeader } from "./tool-chain-header.js";
import { COLLAPSE_AFTER, failed } from "./tool-chips-model.js";
import { ToolList } from "./tool-list.js";

const Chain = toStyled(ChainOfThought, "tools -ml-2");

const ToolChips = ({
  tools,
  running,
  workTree,
  flat = false,
}: {
  tools: ToolRow[];
  running: boolean;
  workTree: string | null;
  flat?: boolean;
}): ReactElement | null => {
  const [open, setOpen] = useState<boolean | null>(null);

  const handleOpenChange = useCallback(
    (next: boolean): void => setOpen(next),
    []
  );

  if (tools.length === 0) {
    return null;
  }

  const rows = <ToolList tools={tools} running={running} workTree={workTree} />;

  if (flat || tools.length < COLLAPSE_AFTER) {
    return <div className="tools tool-chips">{rows}</div>;
  }

  const expanded = open ?? (running || tools.some((tool) => failed(tool)));

  return (
    <Chain open={expanded} onOpenChange={handleOpenChange}>
      <ToolChainHeader tools={tools} />
      <ToolChainContent>{rows}</ToolChainContent>
    </Chain>
  );
};

export { ToolChips };
