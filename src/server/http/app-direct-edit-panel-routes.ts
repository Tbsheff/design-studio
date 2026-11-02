import path from "node:path";

import type { Hono } from "hono";

import { componentPreviewsFor } from "../components/preview.js";
import { createComponentService } from "../components/thumbs.js";
import type { AppContext } from "./app-context.js";
import { readBody } from "./app-request.js";
import { registerComponentCreateRoutes } from "./component-create-routes.js";
import { registerComponentPreviewRoutes } from "./component-preview-routes.js";
import { registerComponentVariantRoutes } from "./component-variant-routes.js";
import { registerComponentRoutes } from "./components-routes.js";
import { registerFigmaRoutes } from "./figma-routes.js";
import { registerFillRoutes } from "./fill-routes.js";
import { registerIconRoutes } from "./icon-routes.js";
import { registerInsertRoutes } from "./insert-routes.js";
import { registerLayerStateRoutes } from "./layer-state-routes.js";
import { registerMotionRoutes } from "./motion-routes.js";
import { registerPropsRoutes } from "./props-routes.js";
import { registerReviewRoutes } from "./review-routes.js";
import { registerRulesRoutes } from "./rules-routes.js";
import { registerSpacingRoutes } from "./spacing-routes.js";
import { registerStateStyleRoutes } from "./state-style-routes.js";
import { registerTextStyleRoutes } from "./text-style-routes.js";

const registerComponentPanelRoutes = (app: Hono, ctx: AppContext): void => {
  const { config, loadDirection, preview, projects } = ctx;
  registerComponentRoutes(app, {
    service: createComponentService({
      preview,
      scratchDir: (projectId) =>
        path.join(projects.projectDir(projectId), ".component-shots"),
    }),
    loadDirection,
  });
  registerComponentPreviewRoutes(app, {
    previews: componentPreviewsFor(
      preview,
      path.join(config.dataDir, "component-previews")
    ),
    loadDirection,
  });
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
  const { canvas, editDeps, loadDirection, preview, withDirection } = ctx;
  const withPreview = {
    editDeps,
    preview,
    readBody,
    loadDirection,
    withDirection,
  };
  const plain = { editDeps, readBody, loadDirection, withDirection };
  registerInsertRoutes(app, withPreview);
  registerIconRoutes(app, withPreview);
  registerTextStyleRoutes(app, plain);
  registerMotionRoutes(app, plain);
  registerFillRoutes(app, plain);
  registerSpacingRoutes(app, plain);
  registerStateStyleRoutes(app, { ...plain, canvas });
  registerComponentVariantRoutes(app, withPreview);
  registerFigmaRoutes(app, withPreview);
};

const registerDirectEditPanelRoutes = (app: Hono, ctx: AppContext): void => {
  registerComponentPanelRoutes(app, ctx);
  registerReviewPanelRoutes(app, ctx);
  registerStylePanelRoutes(app, ctx);
};

const registerDirectEditCreateRoutes = (app: Hono, ctx: AppContext): void => {
  const { bus, editDeps, loadDirection, preview, projects, withDirection } =
    ctx;
  registerComponentCreateRoutes(app, {
    editDeps,
    preview,
    readBody,
    loadDirection,
    withDirection,
  });
  registerLayerStateRoutes(app, { projects, bus, readBody });
};

export { registerDirectEditCreateRoutes, registerDirectEditPanelRoutes };
