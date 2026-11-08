import { Context, Effect, Layer } from "effect";

import { attemptKnown } from "../../platform/attempt/index.js";
import type { KnownFailure } from "../../platform/attempt/index.js";
import { toInspectPage } from "./screen-inspect.js";
import type {
  InspectScreenCommand,
  InspectScreenPage,
} from "./screen-model.js";

interface ScreenStoreApi {
  readonly inspect: (
    command: InspectScreenCommand
  ) => Effect.Effect<InspectScreenPage, KnownFailure>;
}

class ScreenStore extends Context.Service<ScreenStore, ScreenStoreApi>()(
  "design-studio/app/ScreenStore"
) {
  declare public readonly access: "read";

  public static readonly layer = Layer.succeed(
    ScreenStore,
    ScreenStore.of({
      inspect: Effect.fn("ScreenStore.inspect")(function* run(
        command: InspectScreenCommand
      ) {
        return yield* attemptKnown(() => toInspectPage(command));
      }),
    })
  );
}

export { ScreenStore };

export type { ScreenStoreApi };
