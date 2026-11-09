import { Context, Effect, Layer } from "effect";

import { attemptKnown } from "../platform/attempt/index.js";
import type { KnownFailure } from "../platform/attempt/index.js";
import { setFileLocks } from "./file-lock-file.js";
import { toFileLockTarget } from "./file-lock-target.js";
import type { LocalOrgScope } from "./local-org-scope.js";
import { ProjectStore } from "./project-store.js";

interface FileLockWriterApi {
  readonly set: (
    projectId: string,
    directionId: string,
    globs: readonly string[]
  ) => Effect.Effect<readonly string[], KnownFailure, LocalOrgScope>;
}

class FileLockWriter extends Context.Service<
  FileLockWriter,
  FileLockWriterApi
>()("design-studio/store/FileLockWriter") {
  declare public readonly access: "write";

  public static readonly layer = Layer.effect(
    FileLockWriter,
    Effect.gen(function* build() {
      const projects = yield* ProjectStore;

      return FileLockWriter.of({
        set: Effect.fn("FileLockWriter.set")(function* run(
          projectId: string,
          directionId: string,
          globs: readonly string[]
        ) {
          const project = yield* projects.get(projectId);
          const target = yield* toFileLockTarget(project, directionId);

          return yield* attemptKnown(() =>
            setFileLocks(target.projectDir, target.directionId, globs)
          );
        }),
      });
    })
  );
}

export { FileLockWriter };

export type { FileLockWriterApi };
