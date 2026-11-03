import { Context, Effect, Layer } from "effect";

import type { KnownFailure } from "../platform/attempt/index.js";
import { attemptLibrary } from "./project-library-runtime.js";
import type { ProjectLibrary } from "./project-library.js";

interface ProjectLibraryStoreApi {
  readonly listTrash: (
    ...args: Parameters<ProjectLibrary["listTrash"]>
  ) => Effect.Effect<
    Awaited<ReturnType<ProjectLibrary["listTrash"]>>,
    KnownFailure
  >;
  readonly trashThumbnail: (
    ...args: Parameters<ProjectLibrary["trashThumbnail"]>
  ) => Effect.Effect<
    Awaited<ReturnType<ProjectLibrary["trashThumbnail"]>>,
    KnownFailure
  >;
}

class ProjectLibraryStore extends Context.Service<
  ProjectLibraryStore,
  ProjectLibraryStoreApi
>()("design-studio/store/ProjectLibraryStore") {
  declare public readonly access: "read";

  public static readonly layer = Layer.succeed(
    ProjectLibraryStore,
    ProjectLibraryStore.of({
      listTrash: Effect.fn("ProjectLibraryStore.listTrash")(function* run(
        ...args: Parameters<ProjectLibrary["listTrash"]>
      ) {
        return yield* attemptLibrary((store) => store.listTrash(...args));
      }),
      trashThumbnail: Effect.fn("ProjectLibraryStore.trashThumbnail")(
        function* run(...args: Parameters<ProjectLibrary["trashThumbnail"]>) {
          return yield* attemptLibrary((store) =>
            store.trashThumbnail(...args)
          );
        }
      ),
    })
  );
}

export { ProjectLibraryStore };

export type { ProjectLibraryStoreApi };
