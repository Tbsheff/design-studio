import { Context, Effect, Layer } from "effect";

import type { KnownFailure } from "../../platform/attempt/index.js";
import type { LayerStyleChange } from "./layer-style-apply.js";
import { runLayerStyleApply } from "./layer-style-run.js";
import type { ApplyLayerStyleCommand } from "./layer-style-run.js";

interface LayerStyleWriterApi {
  readonly apply: (
    command: ApplyLayerStyleCommand
  ) => Effect.Effect<LayerStyleChange, KnownFailure>;
}

class LayerStyleWriter extends Context.Service<
  LayerStyleWriter,
  LayerStyleWriterApi
>()("design-studio/style-scope/LayerStyleWriter") {
  declare public readonly access: "write";

  public static readonly layer = Layer.succeed(
    LayerStyleWriter,
    LayerStyleWriter.of({
      apply: Effect.fn("LayerStyleWriter.apply")(function* run(
        command: ApplyLayerStyleCommand
      ) {
        return yield* runLayerStyleApply(command);
      }),
    })
  );
}

export { LayerStyleWriter };

export type { LayerStyleWriterApi };
