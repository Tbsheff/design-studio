import { useCallback, useState } from "react";

import { copy } from "./copy.js";
import { api } from "./deps.js";
import type { PermissionDecision } from "./deps.js";

interface ApprovalAnswer {
  readonly answer: (decision: PermissionDecision) => Promise<void>;
  readonly busy: boolean;
  readonly error: string | null;
}

const useApprovalAnswer = (
  runId: string,
  requestId: string
): ApprovalAnswer => {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const answer = useCallback(
    async (decision: PermissionDecision): Promise<void> => {
      setBusy(true);
      setError(null);

      try {
        await api.answerPermission(runId, requestId, decision);
      } catch {
        setBusy(false);
        setError(copy.answerFailed);
      }
    },
    [runId, requestId]
  );

  return { answer, busy, error };
};

export { useApprovalAnswer };
