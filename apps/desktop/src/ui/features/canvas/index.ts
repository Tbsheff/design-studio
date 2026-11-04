import { lazy } from "react";

export { Canvas } from "./canvas.js";

const PlayMode = lazy(() => import("./play-mode.js"));

export { PlayMode };

export type { CanvasCommentTools, CanvasDirections } from "./canvas-types.js";
