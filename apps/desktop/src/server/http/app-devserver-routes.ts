import type { Hono } from "hono";

import type { Direction, Project } from "@design-studio/actions/_core/contracts";
import type { AppContext } from "./app-context.js";
import { readBody } from "./app-request.js";
import { registerAppRoutes } from "./app-routes.js";
import { registerFolderInspectRoutes } from "./folder-inspect-routes.js";
import { registerPortRoutes } from "./port-routes.js";
import { registerUsageRoutes } from "./usage-routes.js";

const registerDevserverRoutes = (app: Hono, ctx: AppContext): void => {
  const { commitInit, preview, projects, versions, watchDirection } = ctx;
  registerAppRoutes(app, {
    projects,
    versions,
    preview,
    readBody,
    commitInit: (project: Project) => commitInit(project),
    watch: (project: Project, direction: Direction) =>
      watchDirection(project, direction),
  });
  registerFolderInspectRoutes(app, { projects, preview, readBody });
};

const registerDevserverPortRoutes = (app: Hono, ctx: AppContext): void => {
  const { preview, projects, runner, startRun } = ctx;
  registerPortRoutes(app, {
    projects,
    readBody,
    isRunning: (pid, did) => runner.isRunning(pid, did),
    startRun,
  });
  registerUsageRoutes(app, { projects, preview });
};

export { registerDevserverPortRoutes, registerDevserverRoutes };
