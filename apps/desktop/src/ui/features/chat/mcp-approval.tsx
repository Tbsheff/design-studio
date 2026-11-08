import { Icon } from "@design-studio/ui";
import type { ReactElement } from "react";

import { cn } from "../../ai/lib/utils.js";
import { useNow } from "../../platform/clock.js";
import { GROUP_ROLE } from "./aria-role-model.js";
import { copy } from "./copy.js";
import {
  OUTCOME_VIEW,
  SECOND_MS,
  countdown,
  toToolIcon,
} from "./mcp-feed-model.js";
import { useMcpApproval } from "./use-mcp-approval.js";
import type { McpApprovalCard } from "./use-mcp-feed.js";

const toOutcome = (
  card: McpApprovalCard,
  local: McpApprovalCard["outcome"],
  now: number
): McpApprovalCard["outcome"] => {
  if (card.outcome ?? local) {
    return card.outcome ?? local;
  }

  if (now >= card.approval.expiresAt) {
    return "timeout";
  }

  return null;
};

const McpApproval = ({
  card,
  compact = false,
  onAnswer = null,
}: {
  card: McpApprovalCard;
  compact?: boolean;
  onAnswer?: ((allow: boolean) => void) | null;
}): ReactElement => {
  const { approval } = card;
  const state = useMcpApproval(card, onAnswer);
  const { allow, deny } = state;
  const now = useNow(card.outcome === null && state.local === null, SECOND_MS);
  const outcome = toOutcome(card, state.local, now);

  if (outcome) {
    return (
      <div
        className="mcp-approval-done"
        data-testid="mcp-approval"
        data-outcome={outcome}
      >
        <Icon name={OUTCOME_VIEW[outcome].icon} size={14} />
        <strong>{OUTCOME_VIEW[outcome].text}</strong>
        <span className="mcp-approval-done-text" data-tip={approval.title}>
          {approval.title}
        </span>
      </div>
    );
  }

  return (
    <section
      className={cn("permission mcp-approval", compact && "compact")}
      role={GROUP_ROLE}
      aria-label={approval.title}
      data-testid="mcp-approval"
      data-outcome="pending"
    >
      <header className="permission-head">
        <Icon name={toToolIcon(approval.tool, "download")} size={14} />
        <strong>{approval.title}</strong>
      </header>
      {approval.detail && (
        <p className="mcp-approval-detail">{approval.detail}</p>
      )}
      <div className="permission-actions">
        <button
          type="button"
          className="btn small primary"
          disabled={state.isPending}
          onClick={allow}
        >
          {copy.allowOnce}
        </button>
        <button
          type="button"
          className="btn small"
          disabled={state.isPending}
          onClick={deny}
        >
          {copy.deny}
        </button>
        <span className="mcp-approval-time" aria-live="off">
          {countdown(approval.expiresAt - now)}
          {copy.left}
        </span>
      </div>
      {state.error && (
        <p className="permission-error" role="alert">
          {state.error}
        </p>
      )}
    </section>
  );
};

export { McpApproval };
