import type {
  AgentRunner,
  PreviewService,
  ProjectStore,
  VersionStore,
} from "../../shared/server-ports.js";
import type { StudioRuntime } from "../main/runtime.js";

export interface ExportDeps {
  projects: ProjectStore;
  versions: VersionStore;
  preview: PreviewService;
  runner?: Pick<AgentRunner, "isRunning">;
  runtime?: StudioRuntime | null;
}

export {
  parseFrame,
  parseFrames,
  parseScale,
  resolveSource,
  withPagePath,
} from "../project-source/index.js";

export type { ExportSource } from "../project-source/index.js";
