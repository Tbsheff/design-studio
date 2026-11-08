import { useEffect, useEffectEvent } from "react";

import { OPEN_ROUTE_EVENT, takePendingRoute } from "../../app/project-nav.js";
import { canvasStore } from "./canvas-frames-model.js";

interface OpenRouteDetail {
  readonly projectId?: string;
  readonly route?: string;
}

const noop = (): null => null;

const watchRouteRequests = (
  projectId: string,
  add: (route: string) => void
): (() => void) => {
  const runPending = (): boolean => {
    if (!canvasStore.loaded(projectId)) {
      return false;
    }

    const route = takePendingRoute(projectId);

    if (route) {
      add(route);
    }

    return true;
  };

  let unsubscribe: (() => void) | null = null;

  if (!runPending()) {
    unsubscribe = canvasStore.subscribe(() =>
      queueMicrotask(() => runPending() && unsubscribe?.())
    );
  }

  const onRoute = (event: Event): void => {
    const { detail } = event as CustomEvent<OpenRouteDetail>;

    if (detail?.projectId === projectId && detail.route) {
      add(detail.route);
    }
  };

  globalThis.addEventListener(OPEN_ROUTE_EVENT, onRoute);

  return (): void => {
    unsubscribe?.();
    globalThis.removeEventListener(OPEN_ROUTE_EVENT, onRoute);
  };
};

const useRouteRequests = (
  projectId: string,
  isApp: boolean,
  addRoute: (route: string) => void
): void => {
  const add = useEffectEvent(addRoute);

  useEffect(() => {
    if (!isApp) {
      return noop;
    }

    return watchRouteRequests(projectId, add);
  }, [projectId, isApp]);
};

export { useRouteRequests };
