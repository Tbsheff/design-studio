import path from "node:path";

import { Hono } from "hono";

import { APP_STREAM_PATH } from "../../shared/app-stream.js";
import { CANVAS_FILE } from "../../shared/canvas-file.js";
import { STUDIO_TOKEN_HEADER } from "../../shared/contracts.js";
import type { Direction, Project } from "../../shared/contracts.js";
import { componentPreviewsFor } from "../components/preview.js";
import { createComponentService } from "../components/thumbs.js";
import { invalidateTokenSource } from "../design-system/token-preview.js";
import { createProjectLibrary } from "../store/project-library.js";
import { registerVariationRoutes } from "../variations/routes.js";
import { createAppContext, type AppDeps } from "./app-context.js";
import { registerDirectEditRoutes } from "./app-direct-edit-routes.js";
import { toErrorReply } from "./app-errors.js";
import { registerEventsRoutes } from "./app-events-routes.js";
import {
  registerProjectDetailRoutes,
  registerProjectsRoutes,
} from "./app-projects-routes.js";
import { readBody } from "./app-request.js";
import { registerAppRoutes } from "./app-routes.js";
import {
  registerProjectRunsRoutes,
  registerRunsRoutes,
} from "./app-runs-routes.js";
import { registerSessionRoutes } from "./app-session-routes.js";
import { registerStudioRoutes } from "./app-studio-routes.js";
import { registerVersionsRoutes } from "./app-versions-routes.js";
import { registerWorkspacesRoutes } from "./app-workspaces-routes.js";
import { registerCanvasRoutes } from "./canvas-routes.js";
import { registerCommentRoutes } from "./comments-routes.js";
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
import { isRunSummary } from "./run-list.js";
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
    comments,
    commitDesignMd,
    commitInit,
    config,
    defaultFolder,
    editDeps,
    editHistory,
    findRunProject,
    forkDirection,
    library,
    liveDrafts,
    loadDirection,
    preview,
    projects,
    rulesFor,
    runner,
    runsDir,
    startRun,
    streamTracker,
    thumbnails,
    uiDir,
    versionNames,
    versions,
    watchDirection,
    withDirection,
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

  registerProjectDetailRoutes(app, ctx);
  registerEventsRoutes(app, ctx);
  registerProjectRunsRoutes(app, ctx);
  registerVersionsRoutes(app, ctx);
  registerDirectEditRoutes(app, ctx);

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
