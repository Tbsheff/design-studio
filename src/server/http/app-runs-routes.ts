import path from "node:path";

import type { Hono } from "hono";

import type {
  RunSentRecord,
  RunSummary,
  StudioEvent,
} from "../../shared/contracts.js";
import { NotFoundError, assertSafeId } from "../store/errors.js";
import type { AppContext } from "./app-context.js";
import { parseJsonLines, readOptional } from "./app-project-files.js";

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

export { registerRunsRoutes };
