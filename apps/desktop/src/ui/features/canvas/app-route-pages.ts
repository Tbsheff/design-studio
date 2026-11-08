import type { AttachedApp } from "@design-studio/contracts";

import { api } from "../../api.js";
import { trimSlashes } from "./app-canvas-routes-model.js";

const appRoutePages = (
  projectId: string,
  app: AttachedApp | null | undefined
): (() => Promise<string[]>) | null => {
  if (!app) {
    return null;
  }

  return async () => {
    const { routes } = await api.appRoutes(projectId);

    return routes.flatMap((route) => {
      if (route.dynamic) {
        return [];
      }

      return [trimSlashes(route.route, true)];
    });
  };
};

export { appRoutePages };
