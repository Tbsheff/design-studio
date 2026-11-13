import type { Direction, Project } from "@design-studio/contracts";
import type { Hono } from "hono";

import type { AppContext } from "./app-context.js";
import { readBody } from "./app-request.js";
import { applyFirstVersionHold, registerAppRoutes } from "./app-routes.js";
import type { AppRouteDeps } from "./app-routes.js";
import { registerFolderInspectRoutes } from "./folder-inspect-routes.js";
import { registerPortRoutes } from "./port-routes.js";
import { registerUsageRoutes } from "./usage-routes.js";

const toAppRouteDeps = (ctx: AppContext): AppRouteDeps => {
  const { commitInit, preview, projects, versions, watchDirection } = ctx;

  return {
    projects,
    versions,
    preview,
    readBody,
    commitInit: (project: Project) => commitInit(project),
    watch: (project: Project, direction: Direction) =>
      watchDirection(project, direction),
  };
};

const applyDevserverHold = (app: Hono, ctx: AppContext): void => {
  applyFirstVersionHold(app, toAppRouteDeps(ctx));
};

const registerDevserverRoutes = (app: Hono, ctx: AppContext): void => {
  const { preview, projects } = ctx;
  registerAppRoutes(app, toAppRouteDeps(ctx));
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

export {
  applyDevserverHold,
  registerDevserverPortRoutes,
  registerDevserverRoutes,
};
