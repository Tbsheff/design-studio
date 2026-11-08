import { useReturnFocusOnUnmount } from "@design-studio/ui";
import { useCallback, useEffect, useRef } from "react";
import type { KeyboardEvent, ReactElement } from "react";

import { copy } from "./copy.js";
import { LatencyBreakdown } from "./latency-breakdown.js";
import { RunDetailsHead } from "./run-details-head.js";
import { toRunRows } from "./run-details-model.js";
import { RunDetailsRows } from "./run-details-rows.js";
import { RunIdBadge } from "./run-id-badge.js";
import type { RunView } from "./run-state-model.js";
import { ToolsTable } from "./tools-table.js";

const RunDetails = ({
  projectId,
  run,
  onClose,
}: {
  projectId: string;
  run: RunView;
  onClose: () => void;
}): ReactElement => {
  const closeButton = useRef<HTMLButtonElement>(null);
  useReturnFocusOnUnmount();
  useEffect(() => closeButton.current?.focus(), []);

  const onKeyDown = useCallback(
    (event: KeyboardEvent): void => {
      if (event.key !== "Escape") {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      onClose();
    },
    [onClose]
  );

  return (
    <dialog
      open
      className="drawer"
      aria-label={copy.runDetails}
      onKeyDown={onKeyDown}
    >
      <RunDetailsHead closeButton={closeButton} onClose={onClose} />
      <div className="drawer-body">
        <RunIdBadge runId={run.runId} />
        <RunDetailsRows rows={toRunRows(run)} />
        <LatencyBreakdown projectId={projectId} run={run} />
        {run.summary?.error && (
          <div className="alert error">{run.summary.error}</div>
        )}
        <h4>
          {copy.toolCalls}
          {run.tools.length}
          {copy.text4}
        </h4>
        <ToolsTable tools={run.tools} />
      </div>
    </dialog>
  );
};

export { RunDetails };
