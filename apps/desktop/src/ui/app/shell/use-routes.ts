import type { AppRoute } from "@design-studio/contracts";
import { useEffect, useState } from "react";

import { api, errorText } from "../../api";

interface RoutesState {
  readonly error: string | null;
  readonly routes: AppRoute[] | null;
}

const useRoutes = (projectId: string): RoutesState => {
  const [routes, setRoutes] = useState<AppRoute[] | null>(null);
  const [failure, setFailure] = useState<string | null>(null);

  useEffect(() => {
    let isLive = true;

    const loadRoutes = async (): Promise<void> => {
      try {
        const result = await api.appRoutes(projectId);

        if (isLive) {
          setRoutes(result.routes);
        }
      } catch (error: unknown) {
        if (isLive) {
          setFailure(errorText(error));
        }
      }
    };

    void loadRoutes();

    return (): void => {
      isLive = false;
    };
  }, [projectId]);

  return { error: failure, routes };
};

export { useRoutes };
