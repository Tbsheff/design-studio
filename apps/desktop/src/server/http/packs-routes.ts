import type { Context, Hono } from "hono";

import type { Direction, Project } from "../../shared/contracts.js";
import type { PackLibrary } from "../design-system/library.js";
import { bindPackEdits } from "../design-system/ops/library-core.js";
import type { ProjectPackDeps } from "../design-system/project-pack.js";
import { loadConfig } from "../platform/config/index.js";

interface PackRouteDeps {
  editDeps: ProjectPackDeps;
  library: PackLibrary;
  onDeleted?: (packId: string) => Promise<void>;
  readBody: (c: Context) => Promise<Record<string, unknown>>;
  withDirection: <Value>(
    projectId: string,
    directionId: string,
    task: (project: Project, direction: Direction) => Promise<Value>
  ) => Promise<Value>;
}

const skipDeleted = async (): Promise<void> => {
  await Promise.resolve();
};

const registerPackRoutes = (_app: Hono, deps: PackRouteDeps): void => {
  bindPackEdits(loadConfig().dataDir, {
    editDeps: deps.editDeps,
    onDeleted: deps.onDeleted ?? skipDeleted,
    withDirection: deps.withDirection,
  });
};

export { registerPackRoutes };

export type { PackRouteDeps };
