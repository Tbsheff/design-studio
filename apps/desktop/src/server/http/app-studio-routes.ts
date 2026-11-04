import { appendFile, mkdir } from "node:fs/promises";
import path from "node:path";

import type { Hono } from "hono";

import type { TelemetrySample } from "@design-studio/actions/_core/contracts";
import { BadRequestError, assertSafeId } from "../platform/errors/index.js";
import type { AppContext } from "./app-context.js";
import { parseJsonLines, readOptional } from "./app-project-files.js";
import {
  APP_TELEMETRY_KINDS,
  TELEMETRY_KINDS,
  isRecord,
  optionalString,
  readBody,
  requireString,
} from "./app-request.js";
import { mountAll } from "./mount-all.js";

const registerStudioRoutes = (app: Hono, ctx: AppContext): void => {
  const { appTelemetryFile, folderPicker, projects, runtime, telemetryFile } =
    ctx;

  if (runtime !== null) {
    mountAll(app, runtime);
  }

  app.post("/api/pick-folder", async (c) => {
    if (
      c.req.header("sec-fetch-site") !== undefined &&
      c.req.header("sec-fetch-site") !== "same-origin"
    ) {
      return c.json({ error: "forbidden" }, 403);
    }
    const body = await readBody(c);

    const result = await folderPicker.pick({
      defaultPath: optionalString(body, "defaultPath"),
      title: optionalString(body, "title"),
    });

    if (result.status === "picked") {
      return c.json({ path: result.path });
    }
    if (result.status === "canceled") {
      return c.body(null, 204);
    }
    if (result.status === "unsupported") {
      return c.json(
        { error: "the folder picker needs macOS; paste a path instead" },
        501
      );
    }
    if (result.status === "busy") {
      return c.json({ error: "a folder picker is already open" }, 409);
    }
    if (result.status === "timeout") {
      return c.json({ error: "the folder picker timed out" }, 504);
    }
    console.error("[http] folder picker failed", result.error);

    return c.json({ error: `the folder picker failed: ${result.error}` }, 500);
  });

  app.post("/api/telemetry", async (c) => {
    const body = await readBody(c);
    const kind = body.kind as TelemetrySample["kind"];

    if (!TELEMETRY_KINDS.has(kind)) {
      throw new BadRequestError("unknown telemetry kind");
    }
    const projectId = APP_TELEMETRY_KINDS.has(kind)
      ? optionalString(body, "projectId")
      : requireString(body, "projectId");

    if (typeof body.ms !== "number" || !Number.isFinite(body.ms)) {
      throw new BadRequestError("ms must be a number");
    }
    if (projectId !== undefined) {
      await projects.get(projectId);
    }
    const sample: TelemetrySample = {
      kind,
      ms: body.ms,
      ts: typeof body.ts === "number" ? body.ts : Date.now(),
    };

    if (projectId !== undefined) {
      sample.projectId = projectId;
    }
    const directionId = optionalString(body, "directionId");

    if (directionId !== undefined) {
      sample.directionId = directionId;
    }
    if (isRecord(body.detail)) {
      sample.detail = body.detail;
    }
    const file =
      projectId === undefined ? appTelemetryFile : telemetryFile(projectId);

    await mkdir(path.dirname(file), { recursive: true });
    await appendFile(file, `${JSON.stringify(sample)}\n`);

    return c.json({ ok: true });
  });

  app.get("/api/telemetry", async (c) => {
    const projectId = c.req.query("projectId");
    const appOnly = c.req.query("scope") === "app";

    const files = appOnly
      ? [appTelemetryFile]
      : projectId
        ? [telemetryFile(assertSafeId(projectId, "projectId"))]
        : [
            appTelemetryFile,
            ...(await projects.list()).map((project) =>
              telemetryFile(project.id)
            ),
          ];

    const samples: TelemetrySample[] = [];

    for (const file of files) {
      const text = await readOptional(file);

      if (text !== null) {
        samples.push(...parseJsonLines<TelemetrySample>(text));
      }
    }

    samples.sort((a, b) => a.ts - b.ts);

    return c.json(samples);
  });
};

export { registerStudioRoutes };
