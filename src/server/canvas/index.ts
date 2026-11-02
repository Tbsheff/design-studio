import type { EventBus } from "../types.js";
import { createLinksService } from "./links/links.js";
import { createCanvasCore } from "./service.js";
import type { CanvasService, ProjectDirOf } from "./service.js";

const createCanvasService = (
  bus: EventBus,
  projectDir: ProjectDirOf | null = null
): CanvasService => createCanvasCore(bus, createLinksService, projectDir);

export * from "./service.js";

export { createCanvasService };
