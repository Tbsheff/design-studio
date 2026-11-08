import type { PreviewService } from "../../shared/server-ports.js";
import { bindMcpReadRuntime } from "../preview/mcp-read-core.js";
import type { StudioProjectStore } from "../store/projects.js";

interface DoctorRuntimeDeps {
  readonly preview: PreviewService;
  readonly projects: StudioProjectStore;
}

const setDoctorRuntime = (deps: DoctorRuntimeDeps): void => {
  bindMcpReadRuntime({ preview: deps.preview, projects: deps.projects });
};

export { setDoctorRuntime };

export type { DoctorRuntimeDeps };
