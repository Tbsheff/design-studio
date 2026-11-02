import type { Hono } from "hono";

import type { AppContext } from "./app-context.js";
import type { McpRoutes } from "./app-mcp-routes.js";
import { readBody } from "./app-request.js";
import { registerDoctorRoutes } from "./doctor-routes.js";
import { registerShipRoutes } from "./ship-routes.js";

const registerAppShipRoutes = (
  app: Hono,
  ctx: AppContext,
  mcpRoutes: McpRoutes
): void => {
  const { config, preview, projects, runner } = ctx;
  registerShipRoutes(app, {
    projects,
    runner,
    dataDir: config.dataDir,
    activity: mcpRoutes.activity,
    readBody,
  });
  registerDoctorRoutes(app, { projects, preview, readBody });
};

export { registerAppShipRoutes };
