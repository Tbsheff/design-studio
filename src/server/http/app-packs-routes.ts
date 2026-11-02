import type { Hono } from "hono";

import type { AppContext } from "./app-context.js";
import { readBody } from "./app-request.js";
import { registerDesignSystemRoutes } from "./design-systems-routes.js";
import { registerPackRoutes } from "./packs-routes.js";

const registerAppPacksRoutes = (app: Hono, ctx: AppContext): void => {
  const {
    applyPackOnCreate,
    bus,
    config,
    defaultFolder,
    library,
    liveDrafts,
    projects,
    runner,
    versions,
    watchDirection,
    withDirection,
  } = ctx;
  registerPackRoutes(app, {
    library,
    editDeps: { bus, projects, versions, runner },
    readBody,
    withDirection,
    onDeleted: async (packId) => {
      for (const project of await projects.list()) {
        if (
          project.designSystemFor === packId &&
          !project.designSystemDeleted
        ) {
          await projects.markDesignSystemDeleted(project.id);
        }
      }
    },
  });
  registerDesignSystemRoutes(app, {
    live: liveDrafts,
    library,
    projects,
    runner,
    versions,
    projectsFolder: () => defaultFolder.ensure(),
    finishCreate: (project, pack) =>
      applyPackOnCreate(project, pack, undefined),
    watch: watchDirection,
    readBody,
    allowLoopback: config.fetchAllowLoopback === true,
  });
};

export { registerAppPacksRoutes };
