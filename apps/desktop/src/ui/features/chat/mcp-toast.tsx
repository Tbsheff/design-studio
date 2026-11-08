import type { McpApprovalOutcome } from "@design-studio/contracts";
import { useCallback, useEffect, useRef } from "react";
import type { ReactElement } from "react";

import { findElement } from "../../platform/find-element.js";
import { pick } from "../../platform/pick.js";
import { isTypingTarget } from "../../platform/typing-target.js";
import { useLatest } from "../../platform/use-latest.js";
import { McpApproval } from "./mcp-approval.js";
import { ToastHead } from "./toast-head.js";
import type { McpApprovalCard } from "./use-mcp-feed.js";

const DONE_MS = 5000;

const PRIMARY_ACTION = ".permission-actions .btn.primary";

const toToastTitle = (card: McpApprovalCard): string => {
  const client = card.approval.client || "MCP client";

  if (card.outcome) {
    return client;
  }

  return `${client} needs your answer`;
};

const McpToast = ({
  card,
  isFocus,
  onMark,
  onDrop,
}: {
  card: McpApprovalCard;
  isFocus: boolean;
  onMark: (id: string, outcome: McpApprovalOutcome) => void;
  onDrop: (id: string) => void;
}): ReactElement => {
  const { id } = card.approval;
  const dropToast = useCallback(() => onDrop(id), [onDrop, id]);
  const dropRef = useLatest(dropToast);
  const ref = useRef<HTMLDivElement>(null);
  const shouldFocus = isFocus && !card.outcome;

  const onAnswer = useCallback(
    (isAllowed: boolean): void => onMark(id, pick(isAllowed, "allow", "deny")),
    [onMark, id]
  );

  useEffect(() => {
    if (!card.outcome) {
      return;
    }

    const timer = globalThis.setTimeout(() => dropRef.current(), DONE_MS);

    return (): void => globalThis.clearTimeout(timer);
  }, [card.outcome, dropRef]);

  useEffect(() => {
    if (shouldFocus && ref.current && !isTypingTarget(document.activeElement)) {
      findElement(ref.current, PRIMARY_ACTION)?.focus({ preventScroll: true });
    }
  }, [shouldFocus]);

  return (
    <div ref={ref} className="mcp-toast" data-testid="mcp-toast">
      <ToastHead title={toToastTitle(card)} onDrop={dropToast} />
      <McpApproval card={card} compact onAnswer={onAnswer} />
    </div>
  );
};

export { McpToast };
