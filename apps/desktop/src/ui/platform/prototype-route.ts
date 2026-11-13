import { createLiveStore } from "./live-store.js";
import { openPrototypeDialog } from "./prototype-dialog.js";

const prototypeRoute = createLiveStore<string | null>(null);

const routeSource = createLiveStore<string | null>(null);

const openRoutePrototype = (appProjectId: string, routePath: string): void => {
  prototypeRoute.set(routePath);
  openPrototypeDialog(appProjectId);
};

const clearPrototypeRoute = (): void => {
  prototypeRoute.set(null);
};

const setRouteSource = (appProjectId: string | null): void => {
  routeSource.set(appProjectId);
};

export {
  clearPrototypeRoute,
  openRoutePrototype,
  prototypeRoute,
  routeSource,
  setRouteSource,
};
