import { useCallback, useState, useTransition } from "react";

import type { VectorRequest } from "../../../shared/vector.js";
import { errorText } from "../../api.js";
import { runVector } from "./deps.js";

interface VectorRunState {
  readonly failureText: string | null;
  readonly isPending: boolean;
  readonly submit: (
    request: VectorRequest,
    onDone: (() => void) | null
  ) => void;
}

const useVectorRun = (
  projectId: string,
  directionId: string | null
): VectorRunState => {
  const [isPending, startTransition] = useTransition();
  const [failureText, setFailureText] = useState<string | null>(null);

  const submit = useCallback(
    (request: VectorRequest, onDone: (() => void) | null): void => {
      if (!directionId) {
        return;
      }

      setFailureText(null);

      startTransition(async () => {
        try {
          await runVector(projectId, directionId, request);

          if (onDone) {
            onDone();
          }
        } catch (error) {
          setFailureText(errorText(error));
        }
      });
    },
    [projectId, directionId]
  );

  return { failureText, isPending, submit };
};

export type { VectorRunState };

export { useVectorRun };
