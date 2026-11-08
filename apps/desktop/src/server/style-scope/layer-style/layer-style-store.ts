import { Context, Effect, Layer } from "effect";

import type { KnownFailure } from "../../platform/attempt/index.js";
import type { LayerStyleInfo } from "./layer-style-get.js";
import { runLayerStyleGet } from "./layer-style-run.js";
import type { GetLayerStyleCommand } from "./layer-style-run.js";

interface LayerStyleStoreApi {
  readonly get: (
    command: GetLayerStyleCommand
  ) => Effect.Effect<LayerStyleInfo, KnownFailure>;
}

class LayerStyleStore extends Context.Service<
  LayerStyleStore,
  LayerStyleStoreApi
>()("design-studio/style-scope/LayerStyleStore") {
  declare public readonly access: "read";

  public static readonly layer = Layer.succeed(
    LayerStyleStore,
    LayerStyleStore.of({
      get: Effect.fn("LayerStyleStore.get")(function* run(
        command: GetLayerStyleCommand
      ) {
        return yield* runLayerStyleGet(command);
      }),
    })
  );
}

export { LayerStyleStore };

export type { LayerStyleStoreApi };
