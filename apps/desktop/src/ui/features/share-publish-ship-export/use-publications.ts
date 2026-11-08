import { useCallback, useEffect, useState } from "react";

import type { Publication } from "../../../shared/publish.js";
import { publishApi } from "./publish-api.js";
import { settleValue } from "./settle.js";

interface Publications {
  readonly list: readonly Publication[];
  readonly backendError: string | null;
  readonly reload: () => Promise<void>;
}

const usePublications = (projectId: string): Publications => {
  const [list, setList] = useState<Publication[]>([]);
  const [backendError, setBackendError] = useState<string | null>(null);

  const reload = useCallback(async (): Promise<void> => {
    const next = await publishApi.list(projectId);
    setList(next.items);
    setBackendError(next.backendError);
  }, [projectId]);

  useEffect(() => {
    let isLive = true;
    void settleValue(publishApi.list(projectId), (next) => {
      if (isLive) {
        setList(next.items);
        setBackendError(next.backendError);
      }
    });

    return (): void => {
      isLive = false;
    };
  }, [projectId]);

  return { backendError, list, reload };
};

export { usePublications };

export type { Publications };
