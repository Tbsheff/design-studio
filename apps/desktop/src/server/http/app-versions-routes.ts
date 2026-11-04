import type { Hono } from "hono";

import { CANVAS_FILE } from "@design-studio/actions/_core/canvas-file";
import { invalidateTokenSource } from "../design-system/token-preview.js";
import { BadRequestError } from "../platform/errors/index.js";
import { bindVersionReadRuntime } from "../store/version-read-core.js";
import { bindVersionWriteRuntime } from "../store/version-write-core.js";
import type { AppContext } from "./app-context.js";
import type { McpSlot } from "./app-mcp-routes.js";
import { readBody } from "./app-request.js";
import { registerEditHistoryRoutes } from "./edit-history-routes.js";
import { registerVersionRoutes } from "./version-routes.js";

const registerVersionsRoutes = (app: Hono, ctx: AppContext): void => {
  const {
    bus,
    emitStatus,
    preview,
    projects,
    recordVersion,
    syncPackId,
    versions,
    withDirection,
  } = ctx;

  app.post("/api/projects/:pid/d/:did/undo", async (c) => {
    const version = await withDirection(
      c.req.param("pid"),
      c.req.param("did"),
      async (project, direction) => {
        const restored = await versions.restore(
          project,
          direction,
          "head",
          "undo"
        );

        await recordVersion(project, direction, restored, "undo");
        await syncPackId(project, direction);
        await emitStatus(project, direction);

        return restored;
      }
    );

    return c.json(version);
  });

  app.post("/api/projects/:pid/d/:did/keep", async (c) => {
    const version = await withDirection(
      c.req.param("pid"),
      c.req.param("did"),
      async (project, direction) => {
        const kept = await versions.commit(
          project,
          direction,
          "Kept unfinished changes",
          { kind: "keep" }
        );

        if (kept === null) {
          throw new BadRequestError("no unfinished changes to keep");
        }
        await recordVersion(project, direction, kept);
        await emitStatus(project, direction);

        return kept;
      }
    );

    return c.json(version);
  });

  app.post("/api/projects/:pid/d/:did/discard", async (c) => {
    const status = await withDirection(
      c.req.param("pid"),
      c.req.param("did"),
      async (project, direction) => {
        const discarded = await versions.discard(project, direction);
        bus.emit({
          directionId: direction.id,
          projectId: project.id,
          status: discarded,
          type: "status.changed",
        });

        return discarded;
      }
    );

    return c.json(status);
  });

  app.get("/api/projects/:pid/versions/:vid/preview", async (c) => {
    const project = await projects.get(c.req.param("pid"));
    const versionId = c.req.param("vid");
    const snapshotDir = await versions.snapshot(project, versionId);

    return c.json({
      url: await preview.snapshotUrl(project, versionId, snapshotDir),
    });
  });

  app.get("/api/projects/:pid/versions/:vid/export", async (c) => {
    const project = await projects.get(c.req.param("pid"));
    const version = await versions.get(project, c.req.param("vid"));
    const bytes = await versions.exportZip(project, version.id);

    const safeName =
      project.name
        .replaceAll(/[^A-Za-z0-9._-]+/g, "-")
        .replaceAll(/^-+|-+$/g, "") || "design";

    return new Response(new Uint8Array(bytes), {
      headers: {
        "content-disposition": `attachment; filename="${safeName}-${version.id.slice(0, 8)}.zip"`,
        "content-length": String(bytes.byteLength),
        "content-type": "application/zip",
      },
    });
  });
};

const registerVersionsHistoryRoutes = (
  app: Hono,
  ctx: AppContext,
  mcpSlot: McpSlot
): void => {
  const {
    announceCanvasAt,
    editDeps,
    editHistory,
    emitStatus,
    loadDirection,
    projects,
    recordVersion,
    syncPackId,
    thumbnails,
    versionNames,
    versions,
    withDirection,
  } = ctx;
  bindVersionReadRuntime({
    names: versionNames,
    projects,
    versions,
  });
  registerVersionRoutes(app, { projects, thumbnails });
  bindVersionWriteRuntime({
    editDeps,
    emitStatus,
    history: editHistory,
    names: versionNames,
    onRemapped: (projectId, remapped) => {
      mcpSlot.routes?.activity.remap(projectId, remapped).catch(() => null);
    },
    onRestored: (workTree, relatives) => {
      invalidateTokenSource(workTree);
      if (relatives.includes(CANVAS_FILE)) {
        announceCanvasAt(workTree).catch(() => null);
      }
    },
    projects,
    recordVersion,
    syncPackId,
    versions,
    withDirection,
  });
  registerEditHistoryRoutes(app, {
    history: editHistory,
    editDeps,
    projects,
    readBody,
    loadDirection,
  });
};

export { registerVersionsHistoryRoutes, registerVersionsRoutes };
