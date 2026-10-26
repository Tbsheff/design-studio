import { useEffect, useState } from 'react';
import type { McpApproval } from '../../shared/export';
import { answerMcpApproval } from '../mcpApprovals';
import { useModalDialog } from '../usePopover';

function secondsLeft(approval: McpApproval): number {
  return Math.max(0, Math.ceil((approval.expiresAt - Date.now()) / 1000));
}

export default function McpApprovalDialog({ approval }: { approval: McpApproval }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [left, setLeft] = useState(() => secondsLeft(approval));
  useEffect(() => {
    const timer = window.setInterval(() => setLeft(secondsLeft(approval)), 1000);
    return () => window.clearInterval(timer);
  }, [approval]);
  const answer = (allow: boolean) => {
    if (busy) return;
    setBusy(true);
    setError(null);
    answerMcpApproval(approval.id, allow).catch((err: unknown) => {
      setBusy(false);
      setError(err instanceof Error ? err.message : String(err));
    });
  };
  const dialog = useModalDialog(() => {
    answer(false);
    return false;
  });
  return (
    <dialog ref={dialog.ref} className="modal mcp-approval" aria-label={approval.title} onMouseDown={dialog.onMouseDown} data-testid="mcp-approval">
      <div className="modal-head">
        <div className="titles">
          <h2>{approval.title}</h2>
          <p>Request from Claude Code through the Design Studio MCP server.</p>
        </div>
      </div>
      <div className="modal-body">
        <p className="mcp-approval-detail">{approval.detail}</p>
        {error && (
          <div className="alert error small" role="alert">
            {error}
          </div>
        )}
      </div>
      <div className="modal-foot">
        <span className="hint">
          {left > 0 ? `Refused in ${left} s if you do not answer` : 'Refused'}
        </span>
        <button type="button" className="btn" disabled={busy} data-autofocus onClick={() => answer(false)}>
          Deny
        </button>
        <button type="button" className="btn strong" disabled={busy} onClick={() => answer(true)}>
          Allow
        </button>
      </div>
    </dialog>
  );
}
