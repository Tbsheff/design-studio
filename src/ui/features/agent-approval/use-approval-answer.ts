import { useCallback, useState, useTransition } from "react";

import { copy } from "./copy.js";
import { api } from "./deps.js";
import type { PermissionDecision } from "./deps.js";

interface ApprovalAnswer {
  readonly answer: (decision: PermissionDecision) => Promise<void>;
  readonly busy: boolean;
  readonly error: string | null;
}

const sendAnswer = async (
  runId: string,
  requestId: string,
  decision: PermissionDecision
): Promise<boolean> => {
  try {
    await api.answerPermission(runId, requestId, decision);

    return true;
  } catch {
    return false;
  }
};

const useApprovalAnswer = (
  runId: string,
  requestId: string
): ApprovalAnswer => {
  const [busy, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const answer = useCallback(
    async (decision: PermissionDecision): Promise<void> => {
      setError(null);

      const pending = sendAnswer(runId, requestId, decision);

      startTransition(async () => {
        await pending;
      });

      const isSent = await pending;

      if (!isSent) {
        setError(copy.answerFailed);
      }
    },
    [runId, requestId]
  );

  return { answer, busy, error };
};

export { useApprovalAnswer };
