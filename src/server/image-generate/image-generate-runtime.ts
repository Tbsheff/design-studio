import { Effect } from "effect";

import { attemptKnown, makeRuntimeSlot, requireBound } from "./deps.js";
import type {
  DirectEditDeps,
  Direction,
  KnownFailure,
  PreviewService,
  Project,
} from "./deps.js";

interface ImageGenerateRuntime {
  readonly editDeps: DirectEditDeps;
  readonly preview: PreviewService;
  readonly withDirection: <Value>(
    projectId: string,
    directionId: string,
    task: (project: Project, direction: Direction) => Promise<Value>
  ) => Promise<Value>;
}

const runtimes = makeRuntimeSlot<ImageGenerateRuntime>("ImageGenerate");

const bindImageGenerateRuntime = (runtime: ImageGenerateRuntime): void => {
  runtimes.bind(runtime);
};

const attemptImage = <Value>(
  task: (runtime: ImageGenerateRuntime) => Promise<Value>
): Effect.Effect<Value, KnownFailure> =>
  Effect.gen(function* withRuntime() {
    const runtime = yield* requireBound("ImageGenerate", runtimes.peek());

    return yield* attemptKnown(() => task(runtime));
  });

export { attemptImage, bindImageGenerateRuntime };

export type { ImageGenerateRuntime };
