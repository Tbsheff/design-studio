import type { Hono } from "hono";

import type { AppContext } from "./app-context.js";
import { readBody } from "./app-request.js";
import { registerShareRoutes } from "./share-routes.js";

const registerAppShareRoutes = (app: Hono, ctx: AppContext): void => {
  const { comments, config, preview, projects, versions } = ctx;
  registerShareRoutes(app, {
    projects,
    versions,
    preview,
    comments,
    dataDir: config.dataDir,
    studioPort: config.studioPort,
    readBody,
  });
};

export { registerAppShareRoutes };
