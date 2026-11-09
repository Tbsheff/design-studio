import { Context, Effect, Layer } from "effect";

import { attemptKnown } from "../platform/attempt/index.js";
import type { KnownFailure } from "../platform/attempt/index.js";
import { getFileLocks } from "./file-lock-file.js";
import { toFileLockTarget } from "./file-lock-target.js";
import type { LocalOrgScope } from "./local-org-scope.js";
import { ProjectStore } from "./project-store.js";

interface FileLockStoreApi {
  readonly get: (
    projectId: string,
    directionId: string
  ) => Effect.Effect<readonly string[], KnownFailure, LocalOrgScope>;
}

class FileLockStore extends Context.Service<FileLockStore, FileLockStoreApi>()(
  "design-studio/store/FileLockStore"
) {
  declare public readonly access: "read";

  public static readonly layer = Layer.effect(
    FileLockStore,
    Effect.gen(function* build() {
      const projects = yield* ProjectStore;

      const get = Effect.fn("FileLockStore.get")(function* run(
        projectId: string,
        directionId: string
      ) {
        const project = yield* projects.get(projectId);
        const target = yield* toFileLockTarget(project, directionId);

        return yield* attemptKnown(() =>
          getFileLocks(target.projectDir, target.directionId)
        );
      });

      return FileLockStore.of({ get });
    })
  );
}

export { FileLockStore };

export type { FileLockStoreApi };
