import type { RunStatus } from "@design-studio/contracts";
import type { ReactElement } from "react";

const STATUS_LABEL: Record<RunStatus, string> = {
  budget_exceeded: "Limit reached",
  canceled: "Stopped",
  completed: "Completed",
  failed: "Failed",
  running: "Running",
};

const RunStatusBadge = ({ status }: { status: RunStatus }): ReactElement => (
  <span className={`status ${status}`}>
    <span className="status-dot" aria-hidden="true" />
    {STATUS_LABEL[status]}
  </span>
);

export { RunStatusBadge };
