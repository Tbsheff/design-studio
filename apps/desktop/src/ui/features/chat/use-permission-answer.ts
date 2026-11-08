import type {
  PermissionDecision,
  PermissionRequest,
} from "@design-studio/contracts";
import { useCallback, useState, useTransition } from "react";

import { api, errorText } from "../../api.js";

interface PermissionAnswer {
  error: string | null;
  isPending: boolean;
  onAllow: () => void;
  onAlways: (always: string) => void;
  onDeny: (note: string) => void;
}

const usePermissionAnswer = (
  projectId: string,
  runId: string,
  request: PermissionRequest
): PermissionAnswer => {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const answer = useCallback(
    (decision: PermissionDecision): void => {
      setError(null);
      startTransition(async () => {
        try {
          await api.answerPermission(projectId, runId, request.id, decision);
        } catch (thrownError: unknown) {
          setError(errorText(thrownError));
        }
      });
    },
    [projectId, runId, request.id]
  );

  const onAllow = useCallback(() => answer({ allow: true }), [answer]);

  const onAlways = useCallback(
    (always: string) => answer({ allow: true, always }),
    [answer]
  );

  const onDeny = useCallback(
    (note: string) => {
      if (note) {
        answer({ allow: false, note });
      } else {
        answer({ allow: false });
      }
    },
    [answer]
  );

  return { error, isPending, onAllow, onAlways, onDeny };
};

export { usePermissionAnswer };
