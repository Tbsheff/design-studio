import { useCallback, useState, useTransition } from "react";

import { copy } from "./copy.js";
import { api } from "./deps.js";
import type { PermissionDecision } from "./deps.js";

interface ApprovalAnswer {
  readonly answer: (decision: PermissionDecision) => Promise<void>;
  readonly busy: boolean;
  readonly error: string | null;
}

interface AnswerTarget {
  readonly projectId: string;
  readonly requestId: string;
  readonly runId: string;
}

const sendAnswer = async (
  target: AnswerTarget,
  decision: PermissionDecision
): Promise<boolean> => {
  try {
    await api.answerPermission(
      target.projectId,
      target.runId,
      target.requestId,
      decision
    );

    return true;
  } catch {
    return false;
  }
};

const useApprovalAnswer = (
  projectId: string,
  runId: string,
  requestId: string
): ApprovalAnswer => {
  const [busy, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const answer = useCallback(
    async (decision: PermissionDecision): Promise<void> => {
      setError(null);

      const pending = sendAnswer({ projectId, requestId, runId }, decision);

      startTransition(async () => {
        await pending;
      });

      const isSent = await pending;

      if (!isSent) {
        setError(copy.answerFailed);
      }
    },
    [projectId, runId, requestId]
  );

  return { answer, busy, error };
};

export { useApprovalAnswer };
