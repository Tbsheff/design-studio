import type { Hono } from "hono";

import type { FixApp } from "../mcp/index.js";
import type { KeepVariant } from "../variations/routes.js";
import type { AppContext } from "./app-context.js";
import { fixApp } from "./doctor-routes.js";
import { registerMcpRoutes } from "./mcp-routes.js";
import { registerStreamRoutes } from "./stream-routes.js";

type McpRoutes = ReturnType<typeof registerMcpRoutes>;

interface McpSlot {
  routes: McpRoutes | null;
}

const createMcpSlot = (): McpSlot => ({ routes: null });

const toFixApp =
  (ctx: AppContext): FixApp =>
  (projectId, kind) =>
    fixApp(
      {
        preview: ctx.preview,
        projects: ctx.projects,
        readBody: () => Promise.resolve({}),
      },
      projectId,
      kind
    );

const registerAppMcpRoutes = (
  app: Hono,
  ctx: AppContext,
  slot: McpSlot,
  variations: { readonly keepVariant: KeepVariant }
): McpRoutes => {
  const { config, projects, runtime } = ctx;
  const mcpRoutes = registerMcpRoutes(app, {
    projects,
    versions: ctx.versions,
    preview: ctx.preview,
    runner: ctx.runner,
    canvas: ctx.canvas,
    frameStates: ctx.frameStates,
    bus: ctx.bus,
    dataDir: config.dataDir,
    studioToken: config.studioToken,
    projectsFolder: () => ctx.defaultFolder.ensure(),
    appOpen: ctx.appOpen,
    fixApp: toFixApp(ctx),
    history: ctx.editHistory,
    keepVariant: variations.keepVariant,
    layerLocks: ctx.layerLocks ?? null,
    listener: ctx.mcpListener,
    isAgentToolOpen: config.agentMode === "mock",
    ...(runtime === null ? {} : { runtime }),
  });
  slot.routes = mcpRoutes;
  if (runtime !== null) {
    registerStreamRoutes(app, {
      approvals: mcpRoutes.approvalFeed,
      projects,
      runtime,
      track: ctx.streamTracker,
    });
  }

  return mcpRoutes;
};

export { createMcpSlot, registerAppMcpRoutes };
export type { McpRoutes, McpSlot };
