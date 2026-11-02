import path from "node:path";

import type { Hono } from "hono";

import type {
  RunSentRecord,
  RunSummary,
  StudioEvent,
} from "../../shared/contracts.js";
import {
  captureReferencePage,
  parseReferenceUrls,
} from "../design-system/reference-page.js";
import { ConflictError, NotFoundError, assertSafeId } from "../store/errors.js";
import { registerVariationRoutes } from "../variations/routes.js";
import type { AppContext } from "./app-context.js";
import { parseJsonLines, readOptional } from "./app-project-files.js";
import { optionalString, readBody } from "./app-request.js";
import { parseRunRequest } from "./app-run-parse.js";
import { withCommentInputs } from "./comments-routes.js";
import { registerRunContextRoutes } from "./run-context-routes.js";
import { registerRunControlRoutes } from "./run-control-routes.js";
import { listRunSummaries, runListBody, runListQuery } from "./run-list.js";
import { registerRunTitleRoutes } from "./run-title-routes.js";

const registerRunsRoutes = (app: Hono, ctx: AppContext): void => {
  const { findRunProject, runner, runsDir } = ctx;

  app.get("/api/runs/:runId", async (c) => {
    const runId = assertSafeId(c.req.param("runId"), "runId");
    const pid = await findRunProject(runId);

    if (pid === null) {
      throw new NotFoundError(`run ${runId} not found`);
    }

    const base = path.join(runsDir(pid), runId);
    const summaryText = await readOptional(`${base}.json`);
    const eventsText = await readOptional(`${base}.jsonl`);

    if (summaryText === null && eventsText === null) {
      throw new NotFoundError(`run ${runId} not found`);
    }

    const summary =
      summaryText === null ? null : (JSON.parse(summaryText) as RunSummary);

    const lines = parseJsonLines<StudioEvent | RunSentRecord>(eventsText ?? "");

    const sent = lines.filter(
      (line): line is RunSentRecord => line.type === "run.sent"
    );

    const events = lines.filter(
      (line): line is StudioEvent => line.type !== "run.sent"
    );

    return c.json({ events, sent, summary });
  });

  app.post("/api/runs/:runId/cancel", (c) => {
    const handle = runner.get(assertSafeId(c.req.param("runId"), "runId"));

    if (!handle) {
      throw new NotFoundError("run is not active");
    }

    handle.cancel();

    return c.json({ ok: true });
  });
};

const registerProjectRunsRoutes = (app: Hono, ctx: AppContext): void => {
  const {
    comments,
    config,
    forkDirection,
    liveDrafts,
    loadDirection,
    projects,
    runner,
    runsDir,
    startRun,
    versions,
    waitForStop,
    withDirection,
    withTaskInputs,
  } = ctx;

  app.get("/api/projects/:pid/runs", async (c) => {
    const pid = c.req.param("pid");
    await projects.get(pid);
    const query = runListQuery((name) => c.req.query(name));

    return c.json(runListBody(await listRunSummaries(runsDir(pid)), query));
  });

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

  app.post("/api/projects/:pid/d/:did/runs", async (c) => {
    const body = await readBody(c);
    const request = parseRunRequest(body);

    const referenceUrls = parseReferenceUrls(
      body.referenceUrls,
      config.fetchAllowLoopback === true
    );

    if (referenceUrls.length > 0) {
      request.referencePages = await Promise.all(
        referenceUrls.map((url) =>
          captureReferencePage(url, config.fetchAllowLoopback === true)
        )
      );
    }
    await waitForStop(c.req.param("pid"), c.req.param("did"));

    const runId = await withDirection(
      c.req.param("pid"),
      c.req.param("did"),
      async (project, direction) => {
        if (runner.isRunning(project.id, direction.id)) {
          throw new ConflictError("run_in_progress");
        }
        if (liveDrafts.isReading(project.id)) {
          throw new ConflictError(
            "The studio is still reading the sources. Wait until they finish."
          );
        }
        return startRun(
          project,
          direction,
          await withCommentInputs(
            comments,
            project,
            direction,
            await withTaskInputs(project, direction, request)
          )
        );
      }
    );

    return c.json({ runId });
  });
};

const registerRunsControlRoutes = (app: Hono, ctx: AppContext): void => {
  const { findRunProject, runner, runsDir } = ctx;
  registerRunControlRoutes(app, runner);
  registerRunTitleRoutes(app, { runner, findRunProject, runsDir });
};

const registerRunsVariationRoutes = (app: Hono, ctx: AppContext): void => {
  const {
    config,
    editDeps,
    forkDirection,
    loadDirection,
    projects,
    runner,
    startRun,
    withDirection,
  } = ctx;
  registerVariationRoutes(app, {
    config,
    projects,
    runner,
    startRun,
    withDirection,
    forkDirection,
    edit: editDeps,
  });
  registerRunContextRoutes(app, { loadDirection });
};

export {
  registerProjectRunsRoutes,
  registerRunsControlRoutes,
  registerRunsRoutes,
  registerRunsVariationRoutes,
};
