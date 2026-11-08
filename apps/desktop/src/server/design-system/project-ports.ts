import { cleanAppDir, detectApp, frameworkOf } from "../app/detect.js";
import { nextAppWorkspace } from "../app/workspace-root.js";
import type { EventBus } from "../events/index.js";
import { createLayerLockStore, createProjectStore } from "../store/index.js";
import type {
  LayerLockStore,
  ProjectStorePorts,
  StudioProjectStore,
} from "../store/index.js";
import { findTokenFile } from "./app-tokens/detect.js";

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
