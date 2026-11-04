import { Context, Effect, Layer } from "effect";

import type { KnownFailure } from "./deps.js";
import { galleryRuntime } from "./gallery-runtime.js";
import { inspectGalleryFolder } from "./inspect-gallery.js";
import type { GalleryInspected, InspectCommand } from "./inspect-gallery.js";

interface GalleryStoreApi {
  readonly inspect: (
    command: InspectCommand
  ) => Effect.Effect<GalleryInspected, KnownFailure>;
}

class GalleryStore extends Context.Service<GalleryStore, GalleryStoreApi>()(
  "design-studio/gallery/GalleryStore"
) {
  declare public readonly access: "read";

  public static readonly layer = Layer.succeed(
    GalleryStore,
    GalleryStore.of({
      inspect: Effect.fn("GalleryStore.inspect")(function* run(
        command: InspectCommand
      ) {
        const runtime = yield* galleryRuntime;

        return yield* inspectGalleryFolder(runtime, command);
      }),
    })
  );
}

export { GalleryStore };

export type { GalleryStoreApi };
