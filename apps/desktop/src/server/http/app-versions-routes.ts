import { CANVAS_FILE } from "@design-studio/contracts/canvas-file";
import type { Hono } from "hono";

import { invalidateTokenSource } from "../design-system/token-preview.js";
import { bindVersionReadRuntime } from "../store/version-read-core.js";
import { bindVersionWriteRuntime } from "../store/version-write-core.js";
import type { AppContext } from "./app-context.js";
import type { McpSlot } from "./app-mcp-routes.js";
import { readBody } from "./app-request.js";
import { registerEditHistoryRoutes } from "./edit-history-routes.js";
import { registerVersionRoutes } from "./version-routes.js";

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
    preview,
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
    preview,
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

export { registerVersionsHistoryRoutes };
