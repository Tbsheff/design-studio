import type { Hono } from "hono";

import type { AppContext } from "./app-context.js";
import { registerExportRoutes } from "./export-routes.js";

const registerAppExportRoutes = (app: Hono, ctx: AppContext): void => {
  const {
    canvas,
    comments,
    config,
    defaultFolder,
    preview,
    projects,
    versions,
  } = ctx;
  registerExportRoutes(app, {
    canvas,
    comments,
    preview,
    projects,
    projectsFolder: () => defaultFolder.ensure(),
    studioToken: config.studioToken,
    versions,
  });
};

export { registerAppExportRoutes };
