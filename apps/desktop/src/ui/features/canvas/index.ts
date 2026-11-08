import { lazy } from "react";

import { Canvas } from "./canvas.js";

const PlayMode = lazy(() => import("./play-mode.js"));

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

export type { CanvasCommentTools, CanvasDirections } from "./canvas-types.js";

export { Canvas, PlayMode };

export { canvasFrameName, framePage } from "./frame-label-model.js";

export { pageName } from "./page-name-model.js";

export { nextSelection } from "./preview-selection-model.js";
export { runVector } from "./vector-tool-model.js";

export { cleanFramePath, parseLayout } from "./canvas-frames-model.js";

export { historyKeyOf, routeHistoryCommand } from "./use-undo-shortcut.js";

export type { ShortcutState } from "./use-undo-shortcut.js";

export { MAX_INLINE_TEXT, parseTextCommit } from "./use-inline-text-edit.js";

export { focusStageQuietly } from "./use-inline-text-edit.js";

export type { PreviewMenuItem } from "./preview-menu.js";
