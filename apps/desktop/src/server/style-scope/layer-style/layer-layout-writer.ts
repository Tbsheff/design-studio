import { Context, Effect, Layer } from "effect";

import type { KnownFailure } from "../../platform/attempt/index.js";
import { runLayerLayout } from "./layer-layout-run.js";
import type {
  LayerLayoutChange,
  SetLayerLayoutCommand,
} from "./layer-layout-run.js";

interface LayerLayoutWriterApi {
  readonly set: (
    command: SetLayerLayoutCommand
  ) => Effect.Effect<LayerLayoutChange, KnownFailure>;
}

class LayerLayoutWriter extends Context.Service<
  LayerLayoutWriter,
  LayerLayoutWriterApi
>()("design-studio/style-scope/LayerLayoutWriter") {
  declare public readonly access: "write";

  public static readonly layer = Layer.succeed(
    LayerLayoutWriter,
    LayerLayoutWriter.of({
      set: Effect.fn("LayerLayoutWriter.set")(function* run(
        command: SetLayerLayoutCommand
      ) {
        return yield* runLayerLayout(command);
      }),
    })
  );
}

export { LayerLayoutWriter };

export type { LayerLayoutWriterApi };
