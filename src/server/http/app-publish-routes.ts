import type { Hono } from "hono";

import type { AppContext } from "./app-context.js";
import { readBody } from "./app-request.js";
import { registerPublishRoutes } from "./publish-routes.js";

const registerAppPublishRoutes = (app: Hono, ctx: AppContext): void => {
  const { comments, config, preview, projects, versions } = ctx;
  registerPublishRoutes(app, {
    projects,
    versions,
    preview,
    comments,
    dataDir: config.dataDir,
    secrets: [config.studioToken],
    readBody,
  });
};

export { registerAppPublishRoutes };
