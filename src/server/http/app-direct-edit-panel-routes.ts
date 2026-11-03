import type { Hono } from "hono";

import { registerAccessibilityRoutes } from "./accessibility-routes.js";
import type { AppContext } from "./app-context.js";
import { readBody } from "./app-request.js";
import { registerComponentVariantRoutes } from "./component-variant-routes.js";
import { registerComponentRoutes } from "./components-routes.js";
import { registerFigmaRoutes } from "./figma-routes.js";
import { registerFillRoutes } from "./fill-routes.js";
import { registerIconRoutes } from "./icon-routes.js";
import { registerImageSearchRoutes } from "./image-search-routes.js";
import { registerLayerStateRoutes } from "./layer-state-routes.js";
import { registerMotionRoutes } from "./motion-routes.js";
import { registerPropsRoutes } from "./props-routes.js";
import { registerReviewRoutes } from "./review-routes.js";
import { registerRulesRoutes } from "./rules-routes.js";
import { registerSpacingRoutes } from "./spacing-routes.js";
import { registerStackingRoutes } from "./stacking-routes.js";
import { registerStateStyleRoutes } from "./state-style-routes.js";
import { registerTextStyleRoutes } from "./text-style-routes.js";

const registerComponentPanelRoutes = (app: Hono): void => {
  registerComponentRoutes(app);
};

const registerReviewPanelRoutes = (app: Hono, ctx: AppContext): void => {
  const {
    canvas,
    commitDesignMd,
    editDeps,
    loadDirection,
    preview,
    projects,
    rulesFor,
    withDirection,
  } = ctx;
  registerPropsRoutes(app, {
    editDeps,
    preview,
    readBody,
    loadDirection,
    withDirection,
  });
  registerReviewRoutes(app, {
    editDeps,
    preview,
    canvas,
    readBody,
    loadDirection,
    withDirection,
    rulesFor,
  });
  registerRulesRoutes(app, {
    preview,
    canvas,
    readBody,
    loadDirection,
    withDirection,
    projectDir: projects.projectDir,
    commitDesignMd,
  });
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
  registerMotionRoutes(app, plain);
  registerFillRoutes(app, plain);
  registerSpacingRoutes(app, plain);
  registerStateStyleRoutes(app, { ...plain, canvas });
  registerStackingRoutes(app, plain);
  registerAccessibilityRoutes(app, { ...withPreview, canvas });
  registerImageSearchRoutes(app, { ...withPreview, projects });
  registerComponentVariantRoutes(app, withPreview);
  registerFigmaRoutes(app, withPreview);
};

const registerDirectEditPanelRoutes = (app: Hono, ctx: AppContext): void => {
  registerComponentPanelRoutes(app);
  registerReviewPanelRoutes(app, ctx);
  registerStylePanelRoutes(app, ctx);
};

const registerDirectEditCreateRoutes = (app: Hono, ctx: AppContext): void => {
  const { layerLocks, projects } = ctx;
  registerLayerStateRoutes(app, { projects, layerLocks, readBody });
};

export { registerDirectEditCreateRoutes, registerDirectEditPanelRoutes };
