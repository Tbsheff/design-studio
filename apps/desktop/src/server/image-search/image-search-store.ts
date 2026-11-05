import { Context, Effect, Layer } from "effect";

import type { KnownFailure } from "../platform/attempt/index.js";
import type { ImageSearchRequest, ImageSearchResult, Project } from "./deps.js";
import { runImageSearch } from "./image-search-run.js";
import { toImageSearchStatus } from "./status.js";
import type { ImageSearchStatus } from "./status.js";

interface ImageSearchStoreApi {
  readonly inspect: (
    project: Project,
    request: ImageSearchRequest
  ) => Effect.Effect<ImageSearchResult, KnownFailure>;
  readonly status: (
    project: Project
  ) => Effect.Effect<ImageSearchStatus, never>;
}

class ImageSearchStore extends Context.Service<
  ImageSearchStore,
  ImageSearchStoreApi
>()("design-studio/image-search/ImageSearchStore") {
  declare public readonly access: "read";

  public static readonly layer = Layer.succeed(
    ImageSearchStore,
    ImageSearchStore.of({
      inspect: Effect.fn("ImageSearchStore.inspect")(function* run(
        project: Project,
        request: ImageSearchRequest
      ) {
        return yield* runImageSearch(project, request);
      }),
      status: Effect.fn("ImageSearchStore.status")(function* run(
        project: Project
      ) {
        return yield* Effect.succeed(toImageSearchStatus(project));
      }),
    })
  );
}

export { ImageSearchStore };

export type { ImageSearchStoreApi };
