import { cleanAppDir, detectApp, frameworkOf } from "../app/detect.js";
import { nextAppWorkspace } from "../app/workspace-root.js";
import { findTokenFile } from "../design-system/app-tokens/detect.js";
import type { EventBus } from "../events/index.js";
import { createLayerLockStore } from "../store/layer-locks.js";
import type { LayerLockStore } from "../store/layer-locks.js";
import { createProjectStore } from "../store/projects.js";
import type {
  ProjectStorePorts,
  StudioProjectStore,
} from "../store/projects.js";

const projectStorePorts: ProjectStorePorts = {
  apps: { cleanAppDir, detectApp, frameworkOf, nextAppWorkspace },
  packs: { findTokenFile },
};

type StoreArgs = Parameters<typeof createProjectStore>;

const createWiredProjectStore = (
  config: StoreArgs[0],
  versions: StoreArgs[1]
): StudioProjectStore =>
  createProjectStore(config, versions, projectStorePorts);

const createProjectLayerLocks = (
  projects: StudioProjectStore,
  bus: EventBus
): LayerLockStore =>
  createLayerLockStore({
    bus,
    projectDir: (id) => projects.projectDir(id),
  });

export { createProjectLayerLocks, createWiredProjectStore, projectStorePorts };
