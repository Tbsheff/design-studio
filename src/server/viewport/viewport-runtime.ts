import { Effect } from "effect";

import { attemptKnown, makeRuntimeSlot, requireBound } from "./deps.js";
import type {
  CanvasService,
  Direction,
  KnownFailure,
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

const attemptViewport = <Value>(
  task: (runtime: ViewportRuntime) => Promise<Value>
): Effect.Effect<Value, KnownFailure> =>
  Effect.gen(function* withRuntime() {
    const runtime = yield* requireBound("Viewport", runtimes.peek());

    return yield* attemptKnown(() => task(runtime));
  });

export { attemptViewport, bindViewportRuntime };

export type { ViewportRuntime };
