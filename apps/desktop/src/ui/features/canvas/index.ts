import { lazy } from "react";

import { Canvas } from "./canvas.js";

const PlayMode = lazy(async () => {
  const loaded = await import("./play-mode.js");

  return { default: loaded.PlayMode };
});

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

export { canvasVariations } from "./canvas-variations.js";

export type { CanvasCommentTools, CanvasDirections } from "./canvas-types.js";

export { Canvas, PlayMode };
export { nextSelection } from "./preview-selection-model.js";
