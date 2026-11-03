import { Context, Effect, Layer } from "effect";

import type { KnownFailure } from "../platform/attempt/index.js";
import { attemptLibrary } from "./project-library-runtime.js";
import type { ProjectLibrary } from "./project-library.js";

interface ProjectLibraryWriterApi {
  readonly duplicate: (
    ...args: Parameters<ProjectLibrary["duplicate"]>
  ) => Effect.Effect<
    Awaited<ReturnType<ProjectLibrary["duplicate"]>>,
    KnownFailure
  >;
  readonly trash: (
    ...args: Parameters<ProjectLibrary["trash"]>
  ) => Effect.Effect<
    Awaited<ReturnType<ProjectLibrary["trash"]>>,
    KnownFailure
  >;
  readonly restore: (
    ...args: Parameters<ProjectLibrary["restore"]>
  ) => Effect.Effect<
    Awaited<ReturnType<ProjectLibrary["restore"]>>,
    KnownFailure
  >;
  readonly deleteForever: (
    ...args: Parameters<ProjectLibrary["deleteForever"]>
  ) => Effect.Effect<
    Awaited<ReturnType<ProjectLibrary["deleteForever"]>>,
    KnownFailure
  >;
  readonly emptyTrash: (
    ...args: Parameters<ProjectLibrary["emptyTrash"]>
  ) => Effect.Effect<
    Awaited<ReturnType<ProjectLibrary["emptyTrash"]>>,
    KnownFailure
  >;
}

class ProjectLibraryWriter extends Context.Service<
  ProjectLibraryWriter,
  ProjectLibraryWriterApi
>()("design-studio/store/ProjectLibraryWriter") {
  declare public readonly access: "write";

  public static readonly layer = Layer.succeed(
    ProjectLibraryWriter,
    ProjectLibraryWriter.of({
      duplicate: Effect.fn("ProjectLibraryWriter.duplicate")(function* run(
        ...args: Parameters<ProjectLibrary["duplicate"]>
      ) {
        return yield* attemptLibrary((store) => store.duplicate(...args));
      }),
      trash: Effect.fn("ProjectLibraryWriter.trash")(function* run(
        ...args: Parameters<ProjectLibrary["trash"]>
      ) {
        return yield* attemptLibrary((store) => store.trash(...args));
      }),
      restore: Effect.fn("ProjectLibraryWriter.restore")(function* run(
        ...args: Parameters<ProjectLibrary["restore"]>
      ) {
        return yield* attemptLibrary((store) => store.restore(...args));
      }),
      deleteForever: Effect.fn("ProjectLibraryWriter.deleteForever")(
        function* run(...args: Parameters<ProjectLibrary["deleteForever"]>) {
          return yield* attemptLibrary((store) => store.deleteForever(...args));
        }
      ),
      emptyTrash: Effect.fn("ProjectLibraryWriter.emptyTrash")(function* run(
        ...args: Parameters<ProjectLibrary["emptyTrash"]>
      ) {
        return yield* attemptLibrary((store) => store.emptyTrash(...args));
      }),
    })
  );
}

export { ProjectLibraryWriter };

export type { ProjectLibraryWriterApi };
