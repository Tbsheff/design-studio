import { Context, Effect, Layer } from "effect";

import type { KnownFailure } from "../../platform/attempt/index.js";
import { runLayerScale } from "./layer-scale-run.js";
import type {
  LayerScaleChange,
  ScaleLayerStyleCommand,
} from "./layer-scale-run.js";

interface LayerScaleWriterApi {
  readonly update: (
    command: ScaleLayerStyleCommand
  ) => Effect.Effect<LayerScaleChange, KnownFailure>;
}

class LayerScaleWriter extends Context.Service<
  LayerScaleWriter,
  LayerScaleWriterApi
>()("design-studio/style-scope/LayerScaleWriter") {
  declare public readonly access: "write";

  public static readonly layer = Layer.succeed(
    LayerScaleWriter,
    LayerScaleWriter.of({
      update: Effect.fn("LayerScaleWriter.update")(function* run(
        command: ScaleLayerStyleCommand
      ) {
        return yield* runLayerScale(command);
      }),
    })
  );
}

export { LayerScaleWriter };

export type { LayerScaleWriterApi };
