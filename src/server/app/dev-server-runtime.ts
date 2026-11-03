import type { Project } from "../../shared/contracts.js";
import { loadConfig } from "../platform/config/index.js";
import type { StudioProjectStore } from "../store/projects.js";
import type { PreviewService } from "../types.js";
import type { AttachResponse } from "./first-version.js";

interface DevServerRuntime {
  readonly attach: (project: Project) => Promise<AttachResponse>;
  readonly ensureFirstVersion: (project: Project) => void;
  readonly preview: PreviewService;
  readonly projects: Pick<
    StudioProjectStore,
    "attachApp" | "get" | "mainDirection"
  >;
}

const runtimes = new Map<string, DevServerRuntime>();

const bindDevServerRuntime = (runtime: DevServerRuntime): void => {
  runtimes.set(loadConfig().dataDir, runtime);
};

const devServerRuntimeOf = (): DevServerRuntime | null =>
  runtimes.get(loadConfig().dataDir) ?? null;

export { bindDevServerRuntime, devServerRuntimeOf };

export type { DevServerRuntime };
