import type { Hono } from "hono";

import { bindLinkRuntime } from "../canvas/index.js";
import { bindGalleryRuntime } from "../gallery/index.js";
import { bindViewportRuntime } from "../viewport/index.js";
import type { AppContext } from "./app-context.js";
import { readBody } from "./app-request.js";
import { registerLinkInteractionRoutes } from "./link-interaction-routes.js";
import { registerPageImportRoutes } from "./page-import-routes.js";
import { registerTextSearchRoutes } from "./text-search-routes.js";

const registerAppCanvasRoutes = (app: Hono, ctx: AppContext): void => {
  const {
    canvas,
    config,
    editDeps,
    frameStates,
    loadDirection,
    preview,
    projects,
    withDirection,
  } = ctx;
  bindViewportRuntime({
    canvas,
    dataDir: config.dataDir,
    loadDirection,
    preview,
  });
  bindGalleryRuntime({ canvas, editDeps, loadDirection, preview });
  bindLinkRuntime({
    canvas,
    frameStates,
    preview: preview ?? null,
    projects,
    runner: editDeps.runner,
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
};

export { registerAppCanvasRoutes };
