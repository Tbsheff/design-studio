import type { Hono } from "hono";

import { bindMcpReadRuntime } from "../preview/mcp-read-core.js";
import type { StudioProjectStore } from "../store/projects.js";
import type { PreviewService } from "../types.js";

interface UsageRouteDeps {
  readonly preview?: PreviewService;
  readonly projects: StudioProjectStore;
}

const registerUsageRoutes = (_app: Hono, deps: UsageRouteDeps): void => {
  bindMcpReadRuntime({
    preview: deps.preview ?? null,
    projects: deps.projects,
  });
};

export { registerUsageRoutes };

export type { UsageRouteDeps };
