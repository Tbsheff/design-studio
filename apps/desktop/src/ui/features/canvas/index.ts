import { lazy } from "react";

import { Canvas } from "./canvas.js";

const PlayMode = lazy(() => import("./play-mode.js"));

export type { CanvasCommentTools, CanvasDirections } from "./canvas-types.js";

export { Canvas, PlayMode };
