import type { Context, Hono } from "hono";

import type { ActivityLog } from "../mcp/activity.js";
import { bindShipRuntime } from "../ship/ship-core.js";
import type { StudioProjectStore } from "../store/projects.js";
import type { AgentRunner } from "../types.js";

interface ShipRouteDeps {
  readonly activity: ActivityLog;
  readonly dataDir: string;
  readonly projects: StudioProjectStore;
  readonly readBody: (context: Context) => Promise<Record<string, unknown>>;
  readonly runner: AgentRunner;
}

const registerShipRoutes = (_app: Hono, deps: ShipRouteDeps): void => {
  bindShipRuntime(deps.dataDir, {
    activity: deps.activity,
    projects: deps.projects,
    runner: deps.runner,
  });
};

export { registerShipRoutes };

export type { ShipRouteDeps };
