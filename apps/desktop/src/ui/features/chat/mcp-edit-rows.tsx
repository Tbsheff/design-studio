import type { McpActivity } from "@design-studio/contracts";
import type { ReactElement } from "react";

import { ActivityRow } from "./activity-row.js";

const McpEditRows = ({
  entries,
  locked,
  onUndo,
}: {
  entries: McpActivity[];
  locked: boolean;
  onUndo: (versionId: string) => void;
}): ReactElement => (
  <ul className="mcp-rows">
    {entries.map((entry) => (
      <ActivityRow
        key={entry.id}
        entry={entry}
        locked={locked}
        onUndo={onUndo}
        readOnly
      />
    ))}
  </ul>
);

export { McpEditRows };
