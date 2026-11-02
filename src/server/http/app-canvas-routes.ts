import type { Hono } from "hono";

import type { AppContext } from "./app-context.js";
import { readBody } from "./app-request.js";
import { registerCanvasRoutes } from "./canvas-routes.js";
import { registerFlowRoutes } from "./flow-routes.js";
import { registerFrameStateRoutes } from "./frame-state-routes.js";
import { registerLinkInteractionRoutes } from "./link-interaction-routes.js";
import { registerPageImportRoutes } from "./page-import-routes.js";
import { registerTextSearchRoutes } from "./text-search-routes.js";

const registerAppCanvasRoutes = (app: Hono, ctx: AppContext): void => {
  const {
    canvas,
    editDeps,
    frameStates,
    loadDirection,
    preview,
    projects,
    withDirection,
  } = ctx;
  registerCanvasRoutes(app, {
    projects,
    canvas,
    frameStates,
    readBody,
    preview,
  });
  registerLinkInteractionRoutes(app, {
    canvas,
    frameStates,
    preview,
    projects,
    readBody,
  });
  registerPageImportRoutes(app, { canvas, editDeps, readBody, withDirection });
  registerTextSearchRoutes(app, {
    canvas,
    editDeps,
    loadDirection,
    readBody,
    withDirection,
  });
  registerFrameStateRoutes(app, { frameStates, projects, readBody });
  registerFlowRoutes(app, { projects, canvas, frameStates, readBody });
};

export { registerAppCanvasRoutes };
