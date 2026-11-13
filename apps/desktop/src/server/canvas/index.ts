import type { EventBus } from "../events/index.js";
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

export { LinkedFrameWriter, toLinkedPrompt } from "./linked-frame/index.js";

export { PageMatchStore, PageMatchWriter } from "./page-match/index.js";

export { FrameImportWriter, toImportPrompt } from "./frame-import/index.js";

export { FrameTidyWriter } from "./frame-tidy/index.js";

export { StateCheckStore, toStateLikeness } from "./state-frames/index.js";

export { applyFrameState } from "./app-flow/index.js";

export { bindLinkRuntime } from "./links/link-runtime.js";

export { toPlayLinks } from "./links/play-links.js";

export type { PlayLinks } from "./links/play-links.js";

export {
  applyPlacement,
  CANVAS_VIEWPORTS,
  canvasList,
  canvasPlace,
  canvasPoint,
  findFrame,
} from "./tools.js";

export type { LinkInteractionRequest } from "./links/index.js";

export type { CanvasToolContext, PlaceSpec, ToolText } from "./tools.js";

export { recordLayout, stepLayout, toLayoutSteps } from "./layout-steps.js";

export { toRecordVersionId } from "./variation-steps.js";

export {
  canvasOwner,
  canvasPath,
  readCanvasAt,
  readProjectCanvas,
  setAsideLegacyCanvas,
} from "./service.js";

export type { CanvasService, ProjectDirOf } from "./service.js";
