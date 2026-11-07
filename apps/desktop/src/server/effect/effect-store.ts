import { Context, Effect, Layer } from "effect";

import type { KnownFailure } from "../platform/attempt/index.js";
import type { EffectInfo, EffectStyleDeleted } from "./deps.js";
import { runEffectGet, runEffectList, runEffectPreview } from "./effect-run.js";
import type {
  DeleteEffectCommand,
  GetEffectCommand,
  ListEffectCommand,
} from "./effect-run.js";
import type { EffectPage } from "./list.js";

interface EffectStoreApi {
  readonly get: (
    command: GetEffectCommand
  ) => Effect.Effect<EffectInfo, KnownFailure>;
  readonly list: (
    command: ListEffectCommand
  ) => Effect.Effect<EffectPage, KnownFailure>;
  readonly preview: (
    command: DeleteEffectCommand
  ) => Effect.Effect<EffectStyleDeleted, KnownFailure>;
}

class EffectStore extends Context.Service<EffectStore, EffectStoreApi>()(
  "design-studio/effect/EffectStore"
) {
  declare public readonly access: "read";

  public static readonly layer = Layer.succeed(
    EffectStore,
    EffectStore.of({
      get: Effect.fn("EffectStore.get")(function* run(
        command: GetEffectCommand
      ) {
        return yield* runEffectGet(command);
      }),
      list: Effect.fn("EffectStore.list")(function* run(
        command: ListEffectCommand
      ) {
        return yield* runEffectList(command);
      }),
      preview: Effect.fn("EffectStore.preview")(function* run(
        command: DeleteEffectCommand
      ) {
        return yield* runEffectPreview(command);
      }),
    })
  );
}

export { EffectStore };

export type { EffectStoreApi };
