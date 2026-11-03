import type { ReactElement } from "react";

import { ApprovalActions } from "./approval-actions.js";
import { toApprovalRows } from "./approval-card-model.js";
import { ApprovalRows } from "./approval-rows.js";
import { Icon } from "./deps.js";
import type { PermissionRequest } from "./deps.js";
import { useApprovalAnswer } from "./use-approval-answer.js";

interface ApprovalCardProps {
  readonly request: PermissionRequest;
  readonly runId: string;
}

const ApprovalCard = ({
  request,
  runId,
}: ApprovalCardProps): ReactElement | null => {
  const { card } = request;
  const { answer, busy, error } = useApprovalAnswer(runId, request.id);

  if (!card) {
    return null;
  }

  return (
    <fieldset
      className="permission"
      aria-label={card.title}
      data-testid="permission-prompt"
    >
      <header className="permission-head">
        <Icon name="terminal" size={14} />
        <strong>{card.title}</strong>
      </header>
      <ApprovalRows rows={toApprovalRows(card)} />
      <ApprovalActions answer={answer} busy={busy} />
      {error && (
        <p className="permission-error" role="alert">
          {error}
        </p>
      )}
    </fieldset>
  );
};

export { ApprovalCard };
