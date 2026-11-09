import { createLiveStore } from "./live-store.js";

const CANVAS_TOOLS = [
  "select",
  "hand",
  "frame",
  "shape",
  "pen",
  "text",
  "comment",
  "prototype",
] as const;

type CanvasToolId = (typeof CANVAS_TOOLS)[number];

type HeldTool = "hand" | "frame" | "text";

const CANVAS_TOOL_EVENT = "studio:canvas-tool";

const PRESENT_EVENT = "studio:present";

const RELOAD_EVENT = "studio:canvas-reload";

const MATRIX_EVENT = "studio:viewport-matrix";

const heldTool = createLiveStore<HeldTool | null>(null);

const requestCanvasTool = (tool: CanvasToolId): void => {
  globalThis.dispatchEvent(
    new CustomEvent(CANVAS_TOOL_EVENT, { detail: tool })
  );
};

const requestPresent = (): void => {
  globalThis.dispatchEvent(new Event(PRESENT_EVENT));
};

const requestReload = (): void => {
  globalThis.dispatchEvent(new Event(RELOAD_EVENT));
};

const requestMatrix = (): void => {
  globalThis.dispatchEvent(new Event(MATRIX_EVENT));
};

const isCanvasToolId = (value: unknown): value is CanvasToolId =>
  CANVAS_TOOLS.some((tool) => tool === value);

export {
  CANVAS_TOOLS,
  CANVAS_TOOL_EVENT,
  MATRIX_EVENT,
  PRESENT_EVENT,
  RELOAD_EVENT,
  heldTool,
  isCanvasToolId,
  requestCanvasTool,
  requestMatrix,
  requestPresent,
  requestReload,
};

export type { CanvasToolId, HeldTool };
