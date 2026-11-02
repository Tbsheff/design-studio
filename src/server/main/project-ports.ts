import { cleanAppDir, detectApp, frameworkOf } from "../app/detect.js";
import { nextAppWorkspace } from "../app/workspace-root.js";
import { findTokenFile } from "../design-system/app-tokens/detect.js";
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

export { createWiredProjectStore, projectStorePorts };
