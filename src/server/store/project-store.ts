import { Context, Effect, Layer } from "effect";

import type { KnownFailure } from "../platform/attempt/index.js";
import { attemptProject } from "./project-runtime.js";
import type { StudioProjectStore } from "./project-types.js";

interface ProjectStoreApi {
  readonly list: (
    ...args: Parameters<StudioProjectStore["list"]>
  ) => Effect.Effect<
    Awaited<ReturnType<StudioProjectStore["list"]>>,
    KnownFailure
  >;
  readonly get: (
    ...args: Parameters<StudioProjectStore["get"]>
  ) => Effect.Effect<
    Awaited<ReturnType<StudioProjectStore["get"]>>,
    KnownFailure
  >;
  readonly getAttachment: (
    ...args: Parameters<StudioProjectStore["getAttachment"]>
  ) => Effect.Effect<
    Awaited<ReturnType<StudioProjectStore["getAttachment"]>>,
    KnownFailure
  >;
  readonly readDesignMd: (
    ...args: Parameters<StudioProjectStore["readDesignMd"]>
  ) => Effect.Effect<
    Awaited<ReturnType<StudioProjectStore["readDesignMd"]>>,
    KnownFailure
  >;
}

class ProjectStore extends Context.Service<ProjectStore, ProjectStoreApi>()(
  "design-studio/store/ProjectStore"
) {
  declare public readonly access: "read";

  public static readonly layer = Layer.succeed(
    ProjectStore,
    ProjectStore.of({
      list: Effect.fn("ProjectStore.list")(function* run(
        ...args: Parameters<StudioProjectStore["list"]>
      ) {
        return yield* attemptProject((store) => store.list(...args));
      }),
      get: Effect.fn("ProjectStore.get")(function* run(
        ...args: Parameters<StudioProjectStore["get"]>
      ) {
        return yield* attemptProject((store) => store.get(...args));
      }),
      getAttachment: Effect.fn("ProjectStore.getAttachment")(function* run(
        ...args: Parameters<StudioProjectStore["getAttachment"]>
      ) {
        return yield* attemptProject((store) => store.getAttachment(...args));
      }),
      readDesignMd: Effect.fn("ProjectStore.readDesignMd")(function* run(
        ...args: Parameters<StudioProjectStore["readDesignMd"]>
      ) {
        return yield* attemptProject((store) => store.readDesignMd(...args));
      }),
    })
  );
}

export { ProjectStore };

export type { ProjectStoreApi };
