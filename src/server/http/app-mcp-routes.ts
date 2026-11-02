import type { Hono } from "hono";

import type { AppContext } from "./app-context.js";
import { registerMcpRoutes } from "./mcp-routes.js";
import { registerStreamRoutes } from "./stream-routes.js";

type McpRoutes = ReturnType<typeof registerMcpRoutes>;

interface McpSlot {
  routes: McpRoutes | null;
}

const createMcpSlot = (): McpSlot => ({ routes: null });

const registerAppMcpRoutes = (
  app: Hono,
  ctx: AppContext,
  slot: McpSlot
): McpRoutes => {
  const {
    appOpen,
    bus,
    canvas,
    config,
    defaultFolder,
    editHistory,
    frameStates,
    preview,
    projects,
    runner,
    runtime,
    streamTracker,
    versions,
  } = ctx;
  const mcpRoutes = registerMcpRoutes(app, {
    projects,
    versions,
    preview,
    runner,
    canvas,
    frameStates,
    bus,
    dataDir: config.dataDir,
    studioToken: config.studioToken,
    projectsFolder: () => defaultFolder.ensure(),
    appOpen,
    history: editHistory,
    runtime,
  });
  slot.routes = mcpRoutes;
  if (runtime !== null) {
    registerStreamRoutes(app, {
      approvals: mcpRoutes.approvalFeed,
      projects,
      runtime,
      track: streamTracker,
    });
  }
  return mcpRoutes;
};

export { createMcpSlot, registerAppMcpRoutes };
export type { McpRoutes, McpSlot };
