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
export { nextSelection } from "./preview-selection-model.js";

export { historyKeyOf } from "./use-undo-shortcut.js";
export { focusStageQuietly } from "./use-inline-text-edit.js";

export type { PreviewMenuItem } from "./preview-menu.js";
