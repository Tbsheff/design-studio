import type { Hono } from "hono";

import type { AppContext } from "./app-context.js";
import { registerExportRoutes } from "./export-routes.js";

const registerAppExportRoutes = (app: Hono, ctx: AppContext): void => {
  const { comments, config, preview, projects, versions } = ctx;
  registerExportRoutes(app, {
    projects,
    versions,
    preview,
    comments,
    studioToken: config.studioToken,
  });
};

export { registerAppExportRoutes };
