import { Context, Effect, Layer } from "effect";

import type { KnownFailure } from "../platform/attempt/index.js";
import type { IconList } from "./deps.js";
import { runIconInspect } from "./icon-run.js";
import type { InspectIconCommand } from "./icon-run.js";

interface IconStoreApi {
  readonly inspect: (
    command: InspectIconCommand
  ) => Effect.Effect<IconList, KnownFailure>;
}

class IconStore extends Context.Service<IconStore, IconStoreApi>()(
  "design-studio/icons/IconStore"
) {
  declare public readonly access: "read";

  public static readonly layer = Layer.succeed(
    IconStore,
    IconStore.of({
      inspect: Effect.fn("IconStore.inspect")(function* run(
        command: InspectIconCommand
      ) {
        return yield* runIconInspect(command);
      }),
    })
  );
}

export { IconStore };

export type { IconStoreApi };
