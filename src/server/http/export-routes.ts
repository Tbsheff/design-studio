import path from "node:path";

import type { Context, Hono } from "hono";

import type { CanvasService } from "../canvas/service.js";
import {
  listEditors,
  openInEditor,
  revealInFinder,
} from "../export/editors.js";
import { bindExportRuntime } from "../export/export-core.js";
import { handoffRoot } from "../export/handoff.js";
import type { ExportDeps } from "../export/source.js";
import { loadConfig } from "../platform/config/index.js";
import {
  BadRequestError,
  NotFoundError,
  assertSafeId,
} from "../platform/errors/index.js";
import type { CommentStore } from "../store/comments.js";

export interface ExportRouteDeps extends ExportDeps {
  canvas?: CanvasService | undefined;
  comments: CommentStore;
  projectsFolder?: (() => Promise<string>) | undefined;
  studioToken: string;
}

async function body(c: Context): Promise<Record<string, unknown>> {
  const parsed: unknown = await c.req.json().catch(() => null);

  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new BadRequestError("body must be a JSON object");
  }

  return parsed as Record<string, unknown>;
}

export function registerExportRoutes(app: Hono, deps: ExportRouteDeps): void {
  const { dataDir } = loadConfig();

  bindExportRuntime(dataDir, {
    ...deps,
    canvas: deps.canvas ?? null,
    dataDir,
    projectsFolder: deps.projectsFolder ?? null,
    secrets: [deps.studioToken],
  });

  app.post("/api/projects/:pid/handoff/:folder/reveal", async (c) => {
    const pid = assertSafeId(c.req.param("pid"), "projectId");

    const target = path.join(
      handoffRoot(deps, pid),
      path.basename(c.req.param("folder")),
      "HANDOFF.md"
    );

    await revealInFinder(target);

    return c.json({ ok: true });
  });

  app.get("/api/editors", (c) => c.json(listEditors()));

  app.post("/api/projects/:pid/d/:did/open-in-editor", async (c) => {
    const input = await body(c);

    const project = await deps.projects.get(
      assertSafeId(c.req.param("pid"), "projectId")
    );

    const did = assertSafeId(c.req.param("did"), "directionId");
    const direction = project.directions.find((d) => d.id === did);

    if (!direction) {
      throw new NotFoundError("direction not found");
    }

    const file =
      typeof input.file === "string" && input.file !== ""
        ? path.resolve(direction.workTree, input.file)
        : undefined;

    if (
      file !== undefined &&
      !file.startsWith(path.resolve(direction.workTree) + path.sep)
    ) {
      throw new BadRequestError("file must be inside the design folder");
    }

    await openInEditor(input.editor, direction.workTree, file);

    return c.json({ ok: true });
  });
}
