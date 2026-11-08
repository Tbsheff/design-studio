import { useCallback } from "react";
import type { ReactElement } from "react";

import { McpApproval } from "./mcp-approval.js";
import { McpBlock } from "./mcp-block.js";
import type { McpFeedControl, TimelineItem } from "./use-mcp-feed.js";

const McpItem = ({
  item,
  mcp,
}: {
  item: Exclude<TimelineItem, { kind: "run" }>;
  mcp: McpFeedControl | null;
}): ReactElement => {
  const onUndo = useCallback(
    (versionId: string): void => mcp?.onUndo(versionId),
    [mcp]
  );

  if (item.kind === "approval") {
    return <McpApproval card={item.card} />;
  }

  return (
    <McpBlock
      client={item.client}
      entries={item.entries}
      locked={mcp?.locked ?? true}
      onUndo={onUndo}
    />
  );
};

export { McpItem };
