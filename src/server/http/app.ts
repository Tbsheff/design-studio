import { readFile } from "node:fs/promises";
import path from "node:path";

import { Hono } from "hono";
import { streamSSE } from "hono/streaming";

import { APP_STREAM_PATH } from "../../shared/app-stream.js";
import type { ArrangeResult } from "../../shared/arrange.js";
import { CANVAS_FILE } from "../../shared/canvas-file.js";
import { STUDIO_TOKEN_HEADER } from "../../shared/contracts.js";
import type {
  Direction,
  DirectEditBatchResult,
  StructureEditResult,
  DirectEditResult,
  Project,
  StudioEvent,
} from "../../shared/contracts.js";
import {
  isStyleReplaceBody,
  type StyleReplaceResult,
} from "../../shared/style-search.js";
import { componentPreviewsFor } from "../components/preview.js";
import { warmPropsTypes } from "../components/props-service.js";
import { createComponentService } from "../components/thumbs.js";
import { appTokensFor } from "../design-system/app-tokens/source.js";
import {
  previewAppTokens,
  updateAppTokens,
} from "../design-system/app-tokens/write.js";
import { createToken } from "../design-system/create-token.js";
import {
  captureReferencePage,
  parseReferenceUrls,
} from "../design-system/reference-page.js";
import { readDesignSystemState } from "../design-system/state.js";
import {
  invalidateTokenSource,
  previewTokens,
} from "../design-system/token-preview.js";
import { updateTokens } from "../design-system/update-tokens.js";
import { applyArrange, isArrangeBody } from "../direct-edit/arrange.js";
import { applyDirectEditBatch } from "../direct-edit/batch.js";
import { applyDirectEdit } from "../direct-edit/commit/apply.js";
import { DirectEditError } from "../direct-edit/engine/errors.js";
import { applyStyleReplace } from "../direct-edit/replace.js";
import { recordRunInHistory } from "../direct-edit/run-record.js";
import { applyStructureEdit } from "../direct-edit/structure-apply.js";
import { isDirectEditBatch, isStructureEdit } from "../direct-edit/validate.js";
import { BadRequestError, ConflictError } from "../store/errors.js";
import { createProjectLibrary } from "../store/project-library.js";
import { trimListedFiles } from "../store/version-names.js";
import { commitTweaks } from "../tweaks/commit.js";
import { readTweaksState } from "../tweaks/store.js";
import { registerVariationRoutes } from "../variations/routes.js";
import { createAppContext, type AppDeps } from "./app-context.js";
import { resolveProjectFile } from "./app-project-files.js";
import { registerProjectsRoutes } from "./app-projects-routes.js";
import {
  HEARTBEAT_MS,
  optionalString,
  readBody,
  requireString,
} from "./app-request.js";
import { registerAppRoutes } from "./app-routes.js";
import { parseRunRequest, parseSettings } from "./app-run-parse.js";
import { registerRunsRoutes } from "./app-runs-routes.js";
import { registerSessionRoutes } from "./app-session-routes.js";
import { registerStudioRoutes } from "./app-studio-routes.js";
import { registerWorkspacesRoutes } from "./app-workspaces-routes.js";
import { registerCanvasRoutes } from "./canvas-routes.js";
import { registerCommentRoutes, withCommentInputs } from "./comments-routes.js";
import { registerComponentCreateRoutes } from "./component-create-routes.js";
import { registerComponentPreviewRoutes } from "./component-preview-routes.js";
import { registerComponentVariantRoutes } from "./component-variant-routes.js";
import { registerComponentRoutes } from "./components-routes.js";
import { registerDesignSystemRoutes } from "./design-systems-routes.js";
import { registerDoctorRoutes } from "./doctor-routes.js";
import { registerEditHistoryRoutes } from "./edit-history-routes.js";
import { registerExportRoutes } from "./export-routes.js";
import { registerFigmaRoutes } from "./figma-routes.js";
import { registerFillRoutes } from "./fill-routes.js";
import { registerFlowRoutes } from "./flow-routes.js";
import { registerFolderInspectRoutes } from "./folder-inspect-routes.js";
import { registerFrameStateRoutes } from "./frame-state-routes.js";
import { registerHomeRoutes } from "./home-routes.js";
import { registerHunkRoutes } from "./hunk-routes.js";
import { registerIconRoutes } from "./icon-routes.js";
import { registerInsertRoutes } from "./insert-routes.js";
import { registerLayerStateRoutes } from "./layer-state-routes.js";
import { registerLinkInteractionRoutes } from "./link-interaction-routes.js";
import { registerMcpRoutes } from "./mcp-routes.js";
import { listWorkTree } from "./mentions.js";
import { registerMotionRoutes } from "./motion-routes.js";
import { registerPackRoutes } from "./packs-routes.js";
import { registerPageImportRoutes } from "./page-import-routes.js";
import { registerPortRoutes } from "./port-routes.js";
import { registerPropsRoutes } from "./props-routes.js";
import { registerPublishRoutes } from "./publish-routes.js";
import { registerReviewRoutes } from "./review-routes.js";
import { registerRulesRoutes } from "./rules-routes.js";
import { registerRunContextRoutes } from "./run-context-routes.js";
import { registerRunControlRoutes } from "./run-control-routes.js";
import {
  isRunSummary,
  listRunSummaries,
  runListBody,
  runListQuery,
} from "./run-list.js";
import { registerRunTitleRoutes } from "./run-title-routes.js";
import { registerShareRoutes } from "./share-routes.js";
import { registerShipRoutes } from "./ship-routes.js";
import { registerSpacingRoutes } from "./spacing-routes.js";
import { renderIndexHtml, serveStatic } from "./static.js";
import { registerStreamRoutes } from "./stream-routes.js";
import { registerTextSearchRoutes } from "./text-search-routes.js";
import { registerTextStyleRoutes } from "./text-style-routes.js";
import { registerUsageRoutes } from "./usage-routes.js";

export { isRunSummary };

export function createApp(deps: AppDeps): Hono {
  const ctx = createAppContext(deps);
  const {
    addParentFolder,
    allowedOrigins,
    announceCanvasAt,
    applyPackOnCreate,
    appOpen,
    bus,
    canvas,
    commandRules,
    comments,
    commitDesignMd,
    commitInit,
    config,
    defaultFolder,
    editDeps,
    editHistory,
    emitStatus,
    findRunProject,
    forkDirection,
    library,
    liveDrafts,
    loadDirection,
    preview,
    projects,
    recordVersion,
    rulesFor,
    runner,
    runsDir,
    startRun,
    streamTracker,
    syncPackId,
    thumbnails,
    uiDir,
    versionNames,
    versions,
    waitForStop,
    watchDirection,
    watchTokenSources,
    withDirection,
    withTaskInputs,
  } = ctx;
  const app = new Hono();
  app.onError((error, c) => {
    const reply = toErrorReply(error);
    if (reply.status === 500) console.error("[http]", error);
    return c.json(reply.body, reply.status);
  });

  registerSessionRoutes(app, ctx);

  app.use("/api/*", async (c, next) => {
    const origin = c.req.header("origin");
    if (origin !== undefined && !allowedOrigins.has(origin))
      return c.json({ error: "forbidden" }, 403);
    const isEventStream =
      c.req.method === "GET" &&
      (/^\/api\/projects\/[^/]+\/events$/.test(c.req.path) ||
        c.req.path === APP_STREAM_PATH);
    const token =
      c.req.header(STUDIO_TOKEN_HEADER) ??
      (isEventStream ? c.req.query("token") : undefined);
    if (token !== config.studioToken)
      return c.json({ error: "forbidden" }, 403);
    await next();
  });

  registerProjectsRoutes(app, ctx);

  registerStudioRoutes(app, ctx);

  const appRouteDeps = {
    projects,
    versions,
    preview,
    readBody,
    commitInit: (project: Project) => commitInit(project),
    watch: (project: Project, direction: Direction) =>
      watchDirection(project, direction),
  };
  registerAppRoutes(app, appRouteDeps);
  registerFolderInspectRoutes(app, { projects, preview, readBody });

  registerWorkspacesRoutes(app, ctx);

  app.get("/api/projects/:pid", async (c) =>
    c.json(await projects.get(c.req.param("pid")))
  );

  app.patch("/api/projects/:pid/settings", async (c) => {
    const pid = c.req.param("pid");
    await projects.get(pid);
    const patch = parseSettings(await readBody(c)) ?? {};
    const project = await projects.updateSettings(pid, patch);
    return c.json(project);
  });

  app.get("/api/projects/:pid/command-rules", async (c) => {
    const project = await projects.get(c.req.param("pid"));
    return c.json({ rules: await commandRules.list(project.id) });
  });

  app.post("/api/projects/:pid/command-rules/remove", async (c) => {
    const project = await projects.get(c.req.param("pid"));
    const rule = requireString(await readBody(c), "rule");
    return c.json({ rules: await commandRules.remove(project.id, rule) });
  });

  app.get("/api/projects/:pid/events", async (c) => {
    const project = await projects.get(c.req.param("pid"));
    const rawAfter =
      c.req.header("last-event-id") ?? c.req.query("after") ?? "0";
    const after = Number.parseInt(rawAfter, 10);
    const afterSeq = Number.isFinite(after) && after >= 0 ? after : 0;
    return streamSSE(c, async (stream) => {
      streamTracker.opened();
      const pending: StudioEvent[] = [];
      let wake: (() => void) | null = null;
      let closed = false;
      const unsubscribe = bus.subscribe(project.id, (event) => {
        pending.push(event);
        wake?.();
      });
      const heartbeat = setInterval(() => {
        void stream.write(": ping\n\n").catch(() => undefined);
      }, HEARTBEAT_MS);
      stream.onAbort(() => {
        closed = true;
        wake?.();
      });
      try {
        let lastSent = afterSeq;
        const send = async (event: StudioEvent): Promise<void> => {
          if (event.seq <= lastSent) return;
          lastSent = event.seq;
          await stream.writeSSE({
            id: String(event.seq),
            event: event.type,
            data: JSON.stringify(event),
          });
        };
        for (const event of await bus.since(project.id, afterSeq))
          await send(event);
        while (!closed) {
          const batch = pending.splice(0);
          for (const event of batch) await send(event);
          if (pending.length === 0 && !closed) {
            await new Promise<void>((resolve) => {
              wake = resolve;
            });
            wake = null;
          }
        }
      } finally {
        streamTracker.closed();
        clearInterval(heartbeat);
        unsubscribe();
      }
    });
  });

  app.post("/api/projects/:pid/attachments", async (c) => {
    const pid = c.req.param("pid");
    const form = await c.req.parseBody();
    const file = form.file;
    if (!(file instanceof File))
      throw new BadRequestError('multipart field "file" is required');
    const attachment = await projects.saveAttachment(pid, {
      name: file.name,
      mime: file.type,
      bytes: new Uint8Array(await file.arrayBuffer()),
    });
    return c.json(attachment);
  });

  app.get("/api/projects/:pid/design-md", async (c) => {
    const content = await projects.readDesignMd(c.req.param("pid"));
    return c.json({ content: content ?? "" });
  });

  app.put("/api/projects/:pid/design-md", async (c) => {
    const body = await readBody(c);
    const content = body.content;
    if (typeof content !== "string")
      throw new BadRequestError("content must be a string");
    const pid = c.req.param("pid");
    await projects.writeDesignMd(pid, content);
    const project = await projects.get(pid);
    const main = projects.mainDirection(project);
    const version = await versions.commitFile(
      project,
      main,
      "DESIGN.md",
      "Update DESIGN.md",
      { kind: "manual" }
    );
    if (version) await recordVersion(project, main, version);
    await emitStatus(project, main);
    return c.json({ ok: true, versionId: version?.id ?? null });
  });

  app.get("/api/projects/:pid/files", async (c) => {
    const pid = c.req.param("pid");
    await projects.get(pid);
    const file = await resolveProjectFile(
      projects.projectDir(pid),
      c.req.query("path") ?? ""
    );
    const bytes = await readFile(file);
    return new Response(new Uint8Array(bytes), {
      headers: { "content-type": "image/png", "cache-control": "no-store" },
    });
  });

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
    return c.json(await forkDirection(pid, { name, fromVersionId }));
  });

  app.get("/api/projects/:pid/d/:did/versions", async (c) => {
    const { project, direction } = await loadDirection(
      c.req.param("pid"),
      c.req.param("did")
    );
    return c.json(
      trimListedFiles(
        await versionNames.apply(
          project.id,
          await versions.list(project, direction)
        )
      )
    );
  });

  app.get("/api/projects/:pid/d/:did/design-system", async (c) => {
    const { project, direction } = await loadDirection(
      c.req.param("pid"),
      c.req.param("did")
    );
    return c.json(await readDesignSystemState(project, direction));
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
    if (referenceUrls.length > 0)
      request.referencePages = await Promise.all(
        referenceUrls.map((url) =>
          captureReferencePage(url, config.fetchAllowLoopback === true)
        )
      );
    await waitForStop(c.req.param("pid"), c.req.param("did"));
    const runId = await withDirection(
      c.req.param("pid"),
      c.req.param("did"),
      async (project, direction) => {
        if (runner.isRunning(project.id, direction.id))
          throw new ConflictError("run_in_progress");
        if (liveDrafts.isReading(project.id))
          throw new ConflictError(
            "The studio is still reading the sources. Wait until they finish."
          );
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

  app.post("/api/projects/:pid/d/:did/design-system/preview", async (c) => {
    const body = await readBody(c);
    try {
      const { project, direction } = await loadDirection(
        c.req.param("pid"),
        c.req.param("did")
      );
      watchTokenSources(project);
      const app = await appTokensFor(project, direction);
      return c.json(
        app
          ? previewAppTokens(app, body)
          : await previewTokens(direction.workTree, body)
      );
    } catch (error) {
      if (error instanceof DirectEditError)
        return c.json(
          { error: error.code, message: error.message },
          error.status
        );
      throw error;
    }
  });

  app.get("/api/projects/:pid/d/:did/tweaks", async (c) => {
    const { direction } = await loadDirection(
      c.req.param("pid"),
      c.req.param("did")
    );
    return c.json(await readTweaksState(direction.workTree));
  });

  app.post("/api/projects/:pid/d/:did/tweaks/commit", async (c) => {
    const body = await readBody(c);
    try {
      const result = await withDirection(
        c.req.param("pid"),
        c.req.param("did"),
        (project, direction) => commitTweaks(editDeps, project, direction, body)
      );
      return c.json(result);
    } catch (error) {
      if (error instanceof DirectEditError)
        return c.json(
          { error: error.code, message: error.message },
          error.status
        );
      throw error;
    }
  });

  app.post(
    "/api/projects/:pid/d/:did/design-system/tokens/update",
    async (c) => {
      const body = await readBody(c);
      try {
        const result = await withDirection(
          c.req.param("pid"),
          c.req.param("did"),
          async (project, direction) =>
            (await updateAppTokens(editDeps, project, direction, body)) ??
            updateTokens(editDeps, project, direction, body)
        );
        return c.json(result);
      } catch (error) {
        if (error instanceof DirectEditError)
          return c.json(
            { error: error.code, message: error.message },
            error.status
          );
        throw error;
      }
    }
  );

  app.post("/api/projects/:pid/d/:did/design-system/tokens", async (c) => {
    const body = await readBody(c);
    try {
      const result = await withDirection(
        c.req.param("pid"),
        c.req.param("did"),
        (project, direction) => createToken(editDeps, project, direction, body)
      );
      return c.json(result);
    } catch (error) {
      if (error instanceof DirectEditError)
        return c.json(
          { error: error.code, message: error.message },
          error.status
        );
      throw error;
    }
  });

  app.post("/api/projects/:pid/d/:did/direct-edit", async (c) => {
    const body = await readBody(c);
    try {
      const result = await withDirection<
        | DirectEditResult
        | DirectEditBatchResult
        | StructureEditResult
        | StyleReplaceResult
        | ArrangeResult
      >(c.req.param("pid"), c.req.param("did"), (project, direction) =>
        isArrangeBody(body)
          ? applyArrange({ ...editDeps, preview }, project, direction, body)
          : isStyleReplaceBody(body)
            ? applyStyleReplace(editDeps, project, direction, body)
            : isStructureEdit(body)
              ? applyStructureEdit(editDeps, project, direction, body)
              : isDirectEditBatch(body)
                ? applyDirectEditBatch(editDeps, project, direction, body)
                : applyDirectEdit(editDeps, project, direction, body)
      );
      return c.json(result);
    } catch (error) {
      if (error instanceof DirectEditError)
        return c.json(
          { error: error.code, message: error.message },
          error.status
        );
      throw error;
    }
  });

  app.post("/api/projects/:pid/d/:did/restore", async (c) => {
    const versionId = requireString(await readBody(c), "versionId");
    const version = await withDirection(
      c.req.param("pid"),
      c.req.param("did"),
      async (project, direction) => {
        const restored = await versions.restore(
          project,
          direction,
          versionId,
          "restore"
        );
        await recordVersion(project, direction, restored, "restore");
        await recordRunInHistory(
          editHistory,
          versions,
          project,
          direction,
          restored.id
        ).catch(() => editHistory.clear(project.id, direction.id));
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
        if (kept === null)
          throw new BadRequestError("no unfinished changes to keep");
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
          type: "status.changed",
          projectId: project.id,
          directionId: direction.id,
          status: discarded,
        });
        return discarded;
      }
    );
    return c.json(status);
  });

  app.get("/api/projects/:pid/d/:did/preview", async (c) => {
    const { project, direction } = await loadDirection(
      c.req.param("pid"),
      c.req.param("did")
    );
    const url = await preview.directionUrl(project, direction);
    warmPropsTypes(project, direction);
    return c.json({ url });
  });

  app.get("/api/projects/:pid/d/:did/tree", async (c) => {
    const { direction } = await loadDirection(
      c.req.param("pid"),
      c.req.param("did")
    );
    return c.json({ files: await listWorkTree(direction.workTree) });
  });

  app.post("/api/projects/:pid/d/:did/check", async (c) => {
    const { project, direction } = await loadDirection(
      c.req.param("pid"),
      c.req.param("did")
    );
    return c.json(
      await preview.renderCheck(
        project,
        direction,
        project.app ? { appOnly: true } : undefined
      )
    );
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
        "content-type": "application/zip",
        "content-disposition": `attachment; filename="${safeName}-${version.id.slice(0, 8)}.zip"`,
        "content-length": String(bytes.byteLength),
      },
    });
  });

  registerRunsRoutes(app, ctx);

  registerRunControlRoutes(app, runner);
  registerRunTitleRoutes(app, { runner, findRunProject, runsDir });

  registerExportRoutes(app, {
    projects,
    versions,
    preview,
    comments,
    studioToken: config.studioToken,
  });
  registerCommentRoutes(app, {
    comments,
    runner,
    runsDir,
    loadDirection,
    withDirection,
    startRun,
    hasAttachment: (pid, id) =>
      projects.getAttachment(pid, id).then(
        () => true,
        () => false
      ),
    prefill: {
      preview,
      projectDir: (id) => projects.projectDir(id),
      getAttachment: (pid, id) => projects.getAttachment(pid, id),
      saveAttachment: (pid, file) => projects.saveAttachment(pid, file),
    },
  });

  registerComponentRoutes(app, {
    service: createComponentService({
      preview,
      scratchDir: (projectId) =>
        path.join(projects.projectDir(projectId), ".component-shots"),
    }),
    loadDirection,
  });
  registerComponentPreviewRoutes(app, {
    previews: componentPreviewsFor(
      preview,
      path.join(config.dataDir, "component-previews")
    ),
    loadDirection,
  });
  registerPropsRoutes(app, {
    editDeps,
    preview,
    readBody,
    loadDirection,
    withDirection,
  });
  registerReviewRoutes(app, {
    editDeps,
    preview,
    canvas,
    readBody,
    loadDirection,
    withDirection,
    rulesFor,
  });
  registerRulesRoutes(app, {
    preview,
    canvas,
    readBody,
    loadDirection,
    withDirection,
    projectDir: projects.projectDir,
    commitDesignMd,
  });
  registerInsertRoutes(app, {
    editDeps,
    preview,
    readBody,
    loadDirection,
    withDirection,
  });
  registerIconRoutes(app, {
    editDeps,
    preview,
    readBody,
    loadDirection,
    withDirection,
  });
  registerTextStyleRoutes(app, {
    editDeps,
    readBody,
    loadDirection,
    withDirection,
  });
  registerMotionRoutes(app, {
    editDeps,
    readBody,
    loadDirection,
    withDirection,
  });
  registerFillRoutes(app, {
    editDeps,
    readBody,
    loadDirection,
    withDirection,
  });
  registerSpacingRoutes(app, {
    editDeps,
    readBody,
    loadDirection,
    withDirection,
  });
  registerComponentVariantRoutes(app, {
    editDeps,
    preview,
    readBody,
    loadDirection,
    withDirection,
  });
  registerFigmaRoutes(app, {
    editDeps,
    preview,
    readBody,
    loadDirection,
    withDirection,
  });

  registerPackRoutes(app, {
    library,
    editDeps: { bus, projects, versions, runner },
    readBody,
    withDirection,
    onDeleted: async (packId) => {
      for (const project of await projects.list())
        if (project.designSystemFor === packId && !project.designSystemDeleted)
          await projects.markDesignSystemDeleted(project.id);
    },
  });

  registerDesignSystemRoutes(app, {
    live: liveDrafts,
    library,
    projects,
    versions,
    projectsFolder: () => defaultFolder.ensure(),
    finishCreate: (project, pack) =>
      applyPackOnCreate(project, pack, undefined),
    watch: watchDirection,
    readBody,
    allowLoopback: config.fetchAllowLoopback === true,
  });

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

  registerVersionRoutes(app, {
    projects,
    versions,
    thumbnails,
    names: versionNames,
    readBody,
  });

  registerEditHistoryRoutes(app, {
    history: editHistory,
    editDeps,
    projects,
    withDirection,
    readBody,
    loadDirection,
    onRestored: (workTree, relatives) => {
      invalidateTokenSource(workTree);
      if (relatives.includes(CANVAS_FILE)) void announceCanvasAt(workTree);
    },
    onRemapped: (projectId, remapped) =>
      void mcpRoutes.activity.remap(projectId, remapped),
  });
  registerHunkRoutes(app, { editDeps, withDirection, readBody });
  registerCanvasRoutes(app, { projects, canvas, readBody, preview });
  registerLinkInteractionRoutes(app, { canvas, preview, projects, readBody });
  registerPageImportRoutes(app, { canvas, editDeps, readBody, withDirection });
  registerTextSearchRoutes(app, {
    canvas,
    editDeps,
    loadDirection,
    readBody,
    withDirection,
  });
  registerFrameStateRoutes(app, { projects, canvas, bus, readBody });
  registerFlowRoutes(app, { projects, canvas, readBody });

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
  const mcpRoutes = registerMcpRoutes(app, {
    projects,
    versions,
    preview,
    runner,
    canvas,
    bus,
    dataDir: config.dataDir,
    studioToken: config.studioToken,
    projectsFolder: () => defaultFolder.ensure(),
    appOpen,
    history: editHistory,
  });
  registerStreamRoutes(app, {
    bus,
    projects,
    approvals: mcpRoutes.approvalFeed,
    track: streamTracker,
  });
  registerShipRoutes(app, {
    projects,
    runner,
    dataDir: config.dataDir,
    activity: mcpRoutes.activity,
    readBody,
  });
  registerDoctorRoutes(app, { projects, preview, readBody });
  registerShareRoutes(app, {
    projects,
    versions,
    preview,
    comments,
    dataDir: config.dataDir,
    studioPort: config.studioPort,
    readBody,
  });
  registerPublishRoutes(app, {
    projects,
    versions,
    preview,
    comments,
    dataDir: config.dataDir,
    secrets: [config.studioToken],
    readBody,
  });
  registerComponentCreateRoutes(app, {
    editDeps,
    preview,
    readBody,
    loadDirection,
    withDirection,
  });
  registerLayerStateRoutes(app, { projects, bus, readBody });
  registerPortRoutes(app, {
    projects,
    readBody,
    isRunning: (pid, did) => runner.isRunning(pid, did),
    startRun,
  });
  registerUsageRoutes(app, { projects, preview });

  app.all("/api/*", (c) => c.json({ error: "not found" }, 404));

  app.get("*", async (c) => {
    const served = await serveStatic(uiDir, c.req.path);
    if (served) return served;
    const html = await renderIndexHtml(uiDir, config);
    return c.html(html);
  });

  return app;
}
