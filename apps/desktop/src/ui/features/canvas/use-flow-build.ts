import { useCallback, useState, useTransition } from "react";
import type { Dispatch, SetStateAction } from "react";

import type { FlowInput, FlowResult } from "../../../shared/route-flow.js";
import { api, errorText } from "../../api.js";

interface FlowBuildState {
  readonly build: () => void;
  readonly isPending: boolean;
  readonly result: FlowResult | null;
}

const toFlowInput = (
  chosen: string[],
  depthLimit: number,
  values: Record<string, string>
): FlowInput => {
  const [first] = chosen;

  if (chosen.length === 1 && depthLimit > 0 && first) {
    return { depth: depthLimit, from: first, params: values };
  }

  return { depth: depthLimit, params: values, routes: chosen };
};

const useFlowBuild = (
  projectId: string,
  input: FlowInput,
  setError: Dispatch<SetStateAction<string | null>>
): FlowBuildState => {
  const [result, setResult] = useState<FlowResult | null>(null);
  const [isPending, startTransition] = useTransition();

  const build = useCallback((): void => {
    setError(null);

    startTransition(async () => {
      try {
        setResult(await api.buildFlow(projectId, input));
      } catch (error: unknown) {
        setError(errorText(error));
      }
    });
  }, [projectId, input, setError]);

  return { build, isPending, result };
};

export { toFlowInput, useFlowBuild };
