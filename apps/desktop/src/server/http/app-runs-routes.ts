import type { Hono } from "hono";

import { loadRepoContext } from "../agent/index.js";
import { bindRunLogRuntime } from "../run-log/index.js";
import { registerVariationRoutes } from "../variations/routes.js";
import type { AppContext } from "./app-context.js";
import { optionalString, readBody } from "./app-request.js";
import { startRunFromCall } from "./app-run-start.js";

const bindRuns = (ctx: AppContext): void => {
  bindRunLogRuntime({
    findRunProject: ctx.findRunProject,
    loadContext: loadRepoContext,
    loadDirection: ctx.loadDirection,
    projects: ctx.projects,
    runner: ctx.runner,
    runsDir: ctx.runsDir,
    startRun: (input) => startRunFromCall(ctx, input),
  });
};

const registerRunsRoutes = (_app: Hono, ctx: AppContext): void => {
  bindRuns(ctx);
};

const registerProjectRunsRoutes = (app: Hono, ctx: AppContext): void => {
  const { forkDirection, loadDirection, versions } = ctx;

  app.post("/api/projects/:pid/directions", async (c) => {
    const pid = c.req.param("pid");
    const body = await readBody(c);
    const fromVersionId = optionalString(body, "fromVersionId") ?? null;
    const name = optionalString(body, "name") ?? "";

    return c.json(await forkDirection(pid, { fromVersionId, name }));
  });

  app.get("/api/projects/:pid/d/:did/status", async (c) => {
    const { project, direction } = await loadDirection(
      c.req.param("pid"),
      c.req.param("did")
    );

    return c.json(await versions.status(project, direction));
  });
};

const registerRunsVariationRoutes = (
  app: Hono,
  ctx: AppContext
): ReturnType<typeof registerVariationRoutes> => {
  const {
    config,
    editDeps,
    forkDirection,
    projects,
    runner,
    startRun,
    withDirection,
  } = ctx;

  return registerVariationRoutes(app, {
    config,
    edit: editDeps,
    forkDirection,
    projects,
    runner,
    startRun,
    withDirection,
  });
};

export {
  registerProjectRunsRoutes,
  registerRunsRoutes,
  registerRunsVariationRoutes,
};
