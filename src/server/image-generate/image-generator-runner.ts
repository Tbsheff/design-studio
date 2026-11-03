import { Context, Effect, Layer } from "effect";

import { createImageFile } from "./create-image.js";
import type { ImageCommand, ImageCreated } from "./create-image.js";
import type { KnownFailure } from "./deps.js";
import { attemptImage } from "./image-generate-runtime.js";

interface ImageGeneratorRunnerApi {
  readonly create: (
    command: ImageCommand
  ) => Effect.Effect<ImageCreated, KnownFailure>;
}

class ImageGeneratorRunner extends Context.Service<
  ImageGeneratorRunner,
  ImageGeneratorRunnerApi
>()("design-studio/image-generate/ImageGeneratorRunner") {
  declare public readonly access: "write";

  public static readonly layer = Layer.succeed(
    ImageGeneratorRunner,
    ImageGeneratorRunner.of({
      create: Effect.fn("ImageGeneratorRunner.create")(function* run(
        command: ImageCommand
      ) {
        return yield* attemptImage((runtime) =>
          createImageFile(runtime, command)
        );
      }),
    })
  );
}

export { ImageGeneratorRunner };

export type { ImageGeneratorRunnerApi };
