import { useEffect, useMemo } from "react";

import { useLive } from "../../platform/live-store.js";
import { useAction } from "../../platform/query.js";
import { devServerRoutes, routeSource, setRouteSource } from "./deps.js";
import { toStaticRoutes } from "./plus-routes-model.js";

interface PlusRoutes {
  readonly appProjectId: string | null;
  readonly routes: readonly string[];
}

const toRoutesInput = (
  appProjectId: string | null
): { readonly projectId: string } | null => {
  if (appProjectId === null) {
    return null;
  }

  return { projectId: appProjectId };
};

const usePlusRoutes = (): PlusRoutes => {
  const appProjectId = useLive(routeSource);
  const input = useMemo(() => toRoutesInput(appProjectId), [appProjectId]);
  const state = useAction(devServerRoutes.listRoutesDevServer, input);
  const rows = state.data?.routes ?? null;
  const routes = useMemo(() => toStaticRoutes(rows), [rows]);

  return { appProjectId, routes };
};

const setRouteSourceEmpty = (): void => {
  setRouteSource(null);
};

const useRouteSource = (appProjectId: string | null): void => {
  useEffect(() => {
    setRouteSource(appProjectId);

    return setRouteSourceEmpty;
  }, [appProjectId]);
};

export { usePlusRoutes, useRouteSource };

export type { PlusRoutes };
