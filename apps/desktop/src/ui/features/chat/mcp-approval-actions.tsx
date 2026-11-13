import type { ReactElement } from "react";

import { copy } from "./copy.js";

interface McpApprovalActionsProps {
  readonly folder: string | null;
  readonly isPending: boolean;
  readonly timeLeft: string;
  readonly onAllow: () => void;
  readonly onAllowFolder: () => void;
  readonly onDeny: () => void;
}

const McpApprovalActions = ({
  folder,
  isPending,
  onAllow,
  onAllowFolder,
  onDeny,
  timeLeft,
}: McpApprovalActionsProps): ReactElement => (
  <div className="permission-actions">
    <button
      type="button"
      className="btn small primary"
      disabled={isPending}
      onClick={onAllow}
    >
      {copy.allowOnce}
    </button>
    {folder !== null && (
      <button
        type="button"
        className="btn small"
        data-tip={folder}
        data-testid="mcp-approval-folder"
        disabled={isPending}
        onClick={onAllowFolder}
      >
        {copy.alwaysFolder}
      </button>
    )}
    <button
      type="button"
      className="btn small"
      disabled={isPending}
      onClick={onDeny}
    >
      {copy.deny}
    </button>
    <span className="mcp-approval-time" aria-live="off">
      {timeLeft}
      {copy.left}
    </span>
  </div>
);

export { McpApprovalActions };
