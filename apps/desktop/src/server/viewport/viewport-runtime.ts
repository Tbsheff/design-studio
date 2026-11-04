import type { MockRule } from "@design-studio/contracts/frame-state";
import type { Effect } from "effect";

import { makeRuntimeSlot } from "./deps.js";
import type {
  CanvasService,
  Direction,
  PreviewService,
  Project,
} from "./deps.js";

interface FrameStateRequest {
  readonly frame: string;
  readonly mock: {
    readonly name: string;
    readonly rules: readonly MockRule[];
    readonly signedIn: boolean;
  } | null;
  readonly state: string;
}

interface ViewportRuntime {
  readonly applyFrameState: (
    project: Project,
    request: FrameStateRequest
  ) => Promise<void>;
  readonly canvas: CanvasService;
  readonly dataDir: string;
  readonly loadDirection: (
    projectId: string,
    directionId: string
  ) => Promise<{ direction: Direction; project: Project }>;
  readonly preview: PreviewService;
  readonly projectDir: (projectId: string) => string;
}

const runtimes = makeRuntimeSlot<ViewportRuntime>("Viewport");

const bindViewportRuntime = (runtime: ViewportRuntime): void => {
  runtimes.bind(runtime);
};

const viewportRuntime: Effect.Effect<ViewportRuntime> = runtimes.read;

export { bindViewportRuntime, viewportRuntime };

export type { FrameStateRequest, ViewportRuntime };
