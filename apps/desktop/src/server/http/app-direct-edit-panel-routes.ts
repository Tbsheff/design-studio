import type { Hono } from "hono";

import { registerAccessibilityRoutes } from "./accessibility-routes.js";
import type { AppContext } from "./app-context.js";
import { readBody } from "./app-request.js";
import { registerComponentVariantRoutes } from "./component-variant-routes.js";
import { registerComponentRoutes } from "./components-routes.js";
import { registerIconRoutes } from "./icon-routes.js";
import { registerImageSearchRoutes } from "./image-search-routes.js";
import { registerLayerStateRoutes } from "./layer-state-routes.js";
import { registerTextStyleRoutes } from "./text-style-routes.js";

const registerComponentPanelRoutes = (app: Hono): void => {
  registerComponentRoutes(app);
};

const registerStylePanelRoutes = (app: Hono, ctx: AppContext): void => {
  const { canvas, editDeps, loadDirection, preview, projects, withDirection } =
    ctx;
  const withPreview = {
    editDeps,
    preview,
    readBody,
    loadDirection,
    withDirection,
  };
  const plain = { editDeps, readBody, loadDirection, withDirection };
  registerIconRoutes(app, withPreview);
  registerTextStyleRoutes(app, plain);
  registerAccessibilityRoutes(app, { ...withPreview, canvas });
  registerImageSearchRoutes(app, { ...withPreview, projects });
  registerComponentVariantRoutes(app, withPreview);
};

const registerDirectEditPanelRoutes = (app: Hono, ctx: AppContext): void => {
  registerComponentPanelRoutes(app);
  registerStylePanelRoutes(app, ctx);
};

const registerDirectEditCreateRoutes = (app: Hono, ctx: AppContext): void => {
  const { layerLocks, projects } = ctx;
  registerLayerStateRoutes(app, { projects, layerLocks, readBody });
};

export { registerDirectEditCreateRoutes, registerDirectEditPanelRoutes };
