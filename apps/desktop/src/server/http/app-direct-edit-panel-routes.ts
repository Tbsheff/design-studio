import type { Hono } from "hono";

import type { AppContext } from "./app-context.js";
import { readBody } from "./app-request.js";
import { registerComponentRoutes } from "./components-routes.js";
import { registerLayerStateRoutes } from "./layer-state-routes.js";

const registerDirectEditPanelRoutes = (app: Hono): void => {
  registerComponentRoutes(app);
};

const registerDirectEditCreateRoutes = (app: Hono, ctx: AppContext): void => {
  const { layerLocks, projects } = ctx;
  registerLayerStateRoutes(app, { projects, layerLocks, readBody });
};

export { registerDirectEditCreateRoutes, registerDirectEditPanelRoutes };
