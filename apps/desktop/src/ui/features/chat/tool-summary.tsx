import { useCallback, useMemo, useState } from "react";
import type { ReactElement, ReactNode } from "react";

import type { ToolRow } from "./run-state-model.js";
import { failed } from "./tool-chips-model.js";
import { toSummaryLabel } from "./tool-item-model.js";
import { ToolSummaryHead } from "./tool-summary-head.js";

const ToolSummary = ({
  tools,
  waitingIds,
  children,
}: {
  tools: ToolRow[];
  waitingIds: ReadonlySet<string>;
  children: ReactNode;
}): ReactElement | null => {
  const [open, setOpen] = useState(false);

  const label = useMemo(
    () => toSummaryLabel(tools, waitingIds),
    [tools, waitingIds]
  );

  const failedCount = useMemo(
    () => tools.filter((tool) => failed(tool)).length,
    [tools]
  );

  const toggle = useCallback((): void => setOpen((value) => !value), []);

  if (tools.length === 0) {
    return null;
  }

  return (
    <div
      className="tool-summary"
      data-open={open || null}
      data-testid="tool-summary"
    >
      <ToolSummaryHead
        count={tools.length}
        failedCount={failedCount}
        isOpen={open}
        label={label}
        onToggle={toggle}
      />
      {open && <div className="tool-summary-body">{children}</div>}
    </div>
  );
};

export { ToolSummary };
