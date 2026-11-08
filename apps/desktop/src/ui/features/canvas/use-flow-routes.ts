import type { AppRoute } from "@design-studio/contracts";
import { useCallback, useEffect, useState } from "react";
import type { Dispatch, SetStateAction } from "react";

import { api, errorText } from "../../api.js";
import { toValueOr } from "./settle-model.js";

interface FlowRoutesState {
  readonly error: string | null;
  readonly params: Record<string, string>;
  readonly routes: AppRoute[] | null;
  readonly setError: Dispatch<SetStateAction<string | null>>;
  readonly setParams: Dispatch<SetStateAction<Record<string, string>>>;
}

const useFlowRoutes = (projectId: string): FlowRoutesState => {
  const [found, setFound] = useState<AppRoute[] | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [failure, setFailure] = useState<string | null>(null);

  const loadRoutes = useCallback(async (): Promise<void> => {
    try {
      const result = await api.appRoutes(projectId);

      setFound(result.routes);
    } catch (error: unknown) {
      setFailure(errorText(error));
    }
  }, [projectId]);

  const loadParams = useCallback(async (): Promise<void> => {
    const result = await toValueOr(api.flowParams(projectId), null);

    if (result) {
      setValues(result.params);
    }
  }, [projectId]);

  useEffect(() => {
    queueMicrotask(loadRoutes);
    queueMicrotask(loadParams);
  }, [loadRoutes, loadParams]);

  return {
    error: failure,
    params: values,
    routes: found,
    setError: setFailure,
    setParams: setValues,
  };
};

export { useFlowRoutes };
