import { Context, Effect, Layer } from "effect";

import { attemptDirectEdit } from "./direct-edit-core.js";
import type { DirectEditFailure } from "./direct-edit-core.js";
import {
  designSystemOf,
  previewUrlOf,
  readTweaks,
  treeOf,
} from "./direct-edit-ops.js";
import type { DirectionRef } from "./direct-edit-ops.js";

interface DirectEditStoreApi {
  readonly getDesignSystem: (
    ref: DirectionRef
  ) => Effect.Effect<
    Awaited<ReturnType<typeof designSystemOf>>,
    DirectEditFailure
  >;
  readonly getPreview: (
    ref: DirectionRef
  ) => Effect.Effect<{ url: string }, DirectEditFailure>;
  readonly getTree: (
    ref: DirectionRef
  ) => Effect.Effect<{ files: string[] }, DirectEditFailure>;
  readonly getTweaks: (
    ref: DirectionRef
  ) => Effect.Effect<Awaited<ReturnType<typeof readTweaks>>, DirectEditFailure>;
}

class DirectEditStore extends Context.Service<
  DirectEditStore,
  DirectEditStoreApi
>()("design-studio/direct-edit/DirectEditStore") {
  declare public readonly access: "read";

  public static readonly layer = Layer.succeed(
    DirectEditStore,
    DirectEditStore.of({
      getDesignSystem: Effect.fn("DirectEditStore.getDesignSystem")(
        function* run(ref: DirectionRef) {
          return yield* attemptDirectEdit((runtime) =>
            designSystemOf(runtime, ref)
          );
        }
      ),
      getPreview: Effect.fn("DirectEditStore.getPreview")(function* run(
        ref: DirectionRef
      ) {
        return yield* attemptDirectEdit((runtime) =>
          previewUrlOf(runtime, ref)
        );
      }),
      getTree: Effect.fn("DirectEditStore.getTree")(function* run(
        ref: DirectionRef
      ) {
        return yield* attemptDirectEdit((runtime) => treeOf(runtime, ref));
      }),
      getTweaks: Effect.fn("DirectEditStore.getTweaks")(function* run(
        ref: DirectionRef
      ) {
        return yield* attemptDirectEdit((runtime) => readTweaks(runtime, ref));
      }),
    })
  );
}

export { DirectEditStore };
