import type { Project } from "../../shared/actions/_core/contracts.js";
import { makeRuntimeSlot } from "../platform/runtime-slot/index.js";
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

const runtimes = makeRuntimeSlot<DevServerRuntime>("App server");

const bindDevServerRuntime = (runtime: DevServerRuntime): void => {
  runtimes.bind(runtime);
};

const devServerRuntimeOf = (): DevServerRuntime | null => runtimes.peek();

export { bindDevServerRuntime, devServerRuntimeOf };

export type { DevServerRuntime };
