import type { Hono } from "hono";

import { applyFrameState, bindLinkRuntime } from "../canvas/index.js";
import { bindGalleryRuntime } from "../gallery/index.js";
import { bindViewportRuntime } from "../viewport/index.js";
import type { AppContext } from "./app-context.js";
import { readBody } from "./app-request.js";
import { registerLinkInteractionRoutes } from "./link-interaction-routes.js";

const registerAppCanvasRoutes = (app: Hono, ctx: AppContext): void => {
  const {
    canvas,
    config,
    editDeps,
    frameStates,
    loadDirection,
    preview,
    projects,
  } = ctx;
  bindViewportRuntime({
    applyFrameState: async (project, request) => {
      const { frame, mock, state } = request;

      if (mock === null) {
        await applyFrameState(frameStates, project, { frame, state });

        return;
      }

      await applyFrameState(frameStates, project, { frame, mock, state });
    },
    canvas,
    dataDir: config.dataDir,
    loadDirection,
    preview,
    projectDir: (projectId) => projects.projectDir(projectId),
  });
  bindGalleryRuntime({ canvas, editDeps, loadDirection, preview });
  bindLinkRuntime({
    canvas,
    frameStates,
    preview: preview ?? null,
    projects,
    runner: editDeps.runner,
  });
  registerLinkInteractionRoutes(app, {
    canvas,
    frameStates,
    preview,
    projects,
    readBody,
  });
};

export { registerAppCanvasRoutes };
