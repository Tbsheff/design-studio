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

export { CanvasStore } from "./canvas-store.js";

export { CanvasWriter } from "./canvas-writer.js";

export { LinkStore, LinkWriter } from "./links/index.js";

export { bindLinkRuntime } from "./links/link-runtime.js";

export {
  applyPlacement,
  CANVAS_VIEWPORTS,
  canvasList,
  canvasPlace,
  canvasPoint,
  findFrame,
  frameRef,
  placeSchema,
} from "./tools.js";

export type { CanvasToolContext, PlaceSpec, ToolText } from "./tools.js";

export { recordLayout, stepLayout } from "./layout-steps.js";

export {
  canvasOwner,
  canvasPath,
  readCanvasAt,
  readProjectCanvas,
  setAsideLegacyCanvas,
} from "./service.js";

export type { CanvasService, ProjectDirOf } from "./service.js";
