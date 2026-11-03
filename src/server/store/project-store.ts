import { Context, Effect, Layer } from "effect";

import { NotFound } from "../../shared/actions/_core/errors/not-found.js";
import type { KnownFailure } from "../platform/attempt/index.js";
import type { OrgScope } from "./org-scope.js";
import { isProjectInScope } from "./project-org.js";
import { attemptProject } from "./project-runtime.js";
import type { StudioProjectStore } from "./project-types.js";

interface ProjectStoreApi {
  readonly list: (
    scope: OrgScope
  ) => Effect.Effect<
    Awaited<ReturnType<StudioProjectStore["list"]>>,
    KnownFailure
  >;
  readonly get: (
    projectId: string,
    scope: OrgScope
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
    projectId: string,
    scope: OrgScope
  ) => Effect.Effect<
    Awaited<ReturnType<StudioProjectStore["readDesignMd"]>>,
    KnownFailure
  >;
}

const MISS_MESSAGE = "The project does not exist.";

const requireInScope = Effect.fn("ProjectStore.requireInScope")(function* run(
  projectId: string,
  scope: OrgScope
) {
  const isVisible = yield* Effect.promise(() =>
    isProjectInScope(scope, projectId)
  );

  if (!isVisible) {
    return yield* new NotFound({ message: MISS_MESSAGE });
  }
});

class ProjectStore extends Context.Service<ProjectStore, ProjectStoreApi>()(
  "design-studio/store/ProjectStore"
) {
  declare public readonly access: "read";

  public static readonly layer = Layer.succeed(
    ProjectStore,
    ProjectStore.of({
      get: Effect.fn("ProjectStore.get")(function* run(
        projectId: string,
        scope: OrgScope
      ) {
        yield* requireInScope(projectId, scope);

        return yield* attemptProject((store) => store.get(projectId));
      }),
      getAttachment: Effect.fn("ProjectStore.getAttachment")(function* run(
        ...args: Parameters<StudioProjectStore["getAttachment"]>
      ) {
        return yield* attemptProject((store) => store.getAttachment(...args));
      }),
      list: Effect.fn("ProjectStore.list")(function* run(scope: OrgScope) {
        const projects = yield* attemptProject((store) => store.list());

        const visible = yield* Effect.promise(() =>
          Promise.all(
            projects.map((project) => isProjectInScope(scope, project.id))
          )
        );

        return projects.filter((_project, index) => visible[index] === true);
      }),
      readDesignMd: Effect.fn("ProjectStore.readDesignMd")(function* run(
        projectId: string,
        scope: OrgScope
      ) {
        yield* requireInScope(projectId, scope);

        return yield* attemptProject((store) => store.readDesignMd(projectId));
      }),
    })
  );
}

export { ProjectStore };

export type { ProjectStoreApi };
