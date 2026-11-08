import { lazy } from "react";

import { Canvas } from "./canvas.js";

const PlayMode = lazy(async () => {
  const loaded = await import("./play-mode.js");

  return { default: loaded.PlayMode };
});

export { Canvas, PlayMode };

export {
  activeFrame,
  addFrame,
  boundsOf,
  defaultLayout,
  FRAME_GAP,
  frameName,
  moveFrame,
  removeFrame,
  resizeActive,
  resizeFrame,
  setFramePath,
  shownFrames,
  viewportOf,
  withFramePath,
} from "./canvas-frame-ops.js";

export {
  followDirection,
  keepDirection,
  placeDirections,
} from "./canvas-direction-ops.js";

export {
  canvasStore,
  cleanFramePath,
  parseLayout,
} from "./canvas-frames-model.js";

export { canvasVariations } from "./canvas-variations.js";

export { canvasFrameName, framePage } from "./frame-label-model.js";

export { pageName } from "./page-name-model.js";

export { nextSelection } from "./preview-selection-model.js";

export { runVector } from "./vector-tool-model.js";

export { historyKeyOf, routeHistoryCommand } from "./use-undo-shortcut.js";

export {
  focusStageQuietly,
  MAX_INLINE_TEXT,
  parseTextCommit,
} from "./use-inline-text-edit.js";

export type { CanvasCommentTools, CanvasDirections } from "./canvas-types.js";

export type { ShortcutState } from "./use-undo-shortcut.js";

export type { PreviewMenuItem } from "./preview-menu.js";
