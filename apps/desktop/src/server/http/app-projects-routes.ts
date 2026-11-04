import type { Hono } from "hono";

import type { Direction, Project } from "../../shared/actions/_core/contracts.js";
import { bindMcpReadRuntime } from "../preview/mcp-read-core.js";
import { bindProjectOpsRuntime } from "../project-ops/index.js";
import { createProjectLibrary } from "../store/project-library.js";
import type { AppContext } from "./app-context.js";
import { resolvePack, resolveProjectFile } from "./app-project-files.js";
import { readBody } from "./app-request.js";
import { finishAttach } from "./app-routes.js";
import { parseLevel, parseSettings, parseStartRun } from "./app-run-parse.js";
import { registerHomeRoutes } from "./home-routes.js";

const registerProjectsRoutes = (_app: Hono, ctx: AppContext): void => {
  const { commitInit, preview, projects, runsDir, versions, watchDirection } =
    ctx;

  const appRouteDeps = {
    commitInit: (project: Project) => commitInit(project),
    preview,
    projects,
    readBody,
    versions,
    watch: (project: Project, direction: Direction) =>
      watchDirection(project, direction),
  };

  bindMcpReadRuntime({ preview, projects, runsDir, versions });

  bindProjectOpsRuntime({
    ...ctx,
    attach: (project) => finishAttach(appRouteDeps, project),
    parsers: {
      level: parseLevel,
      packOf: resolvePack,
      projectFile: resolveProjectFile,
      settings: parseSettings,
      startRun: parseStartRun,
    },
  });
};

const registerHomeProjectRoutes = (app: Hono, ctx: AppContext): void => {
  const {
    addParentFolder,
    commitInit,
    config,
    defaultFolder,
    preview,
    projects,
    runner,
    thumbnails,
    versions,
    watchDirection,
  } = ctx;
  registerHomeRoutes(app, {
    config,
    projects,
    versions,
    library: createProjectLibrary({
      config,
      projects,
      versions,
      preview,
      runner,
      defaultFolder: () => defaultFolder.ensure(),
    }),
    thumbnails,
    defaultFolder,
    readBody,
    commitInit,
    watch: (project) =>
      watchDirection(project, projects.mainDirection(project)),
    addParentFolder,
  });
};

export { registerHomeProjectRoutes, registerProjectsRoutes };
