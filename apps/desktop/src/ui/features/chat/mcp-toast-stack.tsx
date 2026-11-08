import type { McpApprovalOutcome } from "@design-studio/contracts";
import type { ReactElement } from "react";

import { McpToast } from "./mcp-toast.js";
import type { McpApprovalCard } from "./use-mcp-feed.js";

const McpToastStack = ({
  cards,
  isFocus,
  onMark,
  onDrop,
}: {
  cards: McpApprovalCard[];
  isFocus: boolean;
  onMark: (id: string, outcome: McpApprovalOutcome) => void;
  onDrop: (id: string) => void;
}): ReactElement => (
  <>
    {cards.map((card) => (
      <McpToast
        key={card.approval.id}
        card={card}
        isFocus={isFocus}
        onMark={onMark}
        onDrop={onDrop}
      />
    ))}
  </>
);

export { McpToastStack };
