import { Context, Effect, Layer } from "effect";

import type { KnownFailure } from "./deps.js";
import { galleryRuntime } from "./gallery-runtime.js";
import { inspectGallery } from "./inspect-gallery.js";
import type { GalleryInspected, InspectCommand } from "./inspect-gallery.js";

interface GalleryRunnerApi {
  readonly inspect: (
    command: InspectCommand
  ) => Effect.Effect<GalleryInspected, KnownFailure>;
}

class GalleryRunner extends Context.Service<GalleryRunner, GalleryRunnerApi>()(
  "design-studio/gallery/GalleryRunner"
) {
  declare public readonly access: "read";

  public static readonly layer = Layer.succeed(
    GalleryRunner,
    GalleryRunner.of({
      inspect: Effect.fn("GalleryRunner.inspect")(function* run(
        command: InspectCommand
      ) {
        const runtime = yield* galleryRuntime;

        return yield* inspectGallery(runtime, command);
      }),
    })
  );
}

export { GalleryRunner };

export type { GalleryRunnerApi };
