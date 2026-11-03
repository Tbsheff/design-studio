import type { Effect } from "effect";

import { makeRuntimeSlot } from "./deps.js";
import type {
  CanvasService,
  Direction,
  PreviewService,
  Project,
} from "./deps.js";

interface ViewportRuntime {
  readonly canvas: CanvasService;
  readonly dataDir: string;
  readonly loadDirection: (
    projectId: string,
    directionId: string
  ) => Promise<{ direction: Direction; project: Project }>;
  readonly preview: PreviewService;
}

const runtimes = makeRuntimeSlot<ViewportRuntime>("Viewport");

const bindViewportRuntime = (runtime: ViewportRuntime): void => {
  runtimes.bind(runtime);
};

const viewportRuntime: Effect.Effect<ViewportRuntime> = runtimes.read;

export { bindViewportRuntime, viewportRuntime };

export type { ViewportRuntime };
