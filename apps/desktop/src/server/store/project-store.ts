import { NotFound } from "@design-studio/actions/_core/errors/not-found";
import { Context, Effect, Layer } from "effect";

import type { KnownFailure } from "../platform/attempt/index.js";
import { LocalOrgScope } from "./local-org-scope.js";
import {
  isProjectVisible,
  readProjectOrgs,
  toVisibleProjects,
} from "./project-org.js";
import { attemptProject } from "./project-runtime.js";
import type { StudioProjectStore } from "./project-types.js";

interface ProjectStoreApi {
  readonly list: () => Effect.Effect<
    Awaited<ReturnType<StudioProjectStore["list"]>>,
    KnownFailure,
    LocalOrgScope
  >;
  readonly get: (
    projectId: string
  ) => Effect.Effect<
    Awaited<ReturnType<StudioProjectStore["get"]>>,
    KnownFailure,
    LocalOrgScope
  >;
  readonly getAttachment: (
    ...args: Parameters<StudioProjectStore["getAttachment"]>
  ) => Effect.Effect<
    Awaited<ReturnType<StudioProjectStore["getAttachment"]>>,
    KnownFailure
  >;
  readonly readDesignMd: (
    projectId: string
  ) => Effect.Effect<
    Awaited<ReturnType<StudioProjectStore["readDesignMd"]>>,
    KnownFailure,
    LocalOrgScope
  >;
}

const MISS_MESSAGE = "The project does not exist.";

const requireInScope = Effect.fn("ProjectStore.requireInScope")(function* run(
  projectId: string
) {
  const scope = yield* LocalOrgScope;
  const orgs = yield* readProjectOrgs();

  if (!isProjectVisible(scope, orgs, projectId)) {
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
      get: Effect.fn("ProjectStore.get")(function* run(projectId: string) {
        yield* requireInScope(projectId);

        return yield* attemptProject((store) => store.get(projectId));
      }),
      getAttachment: Effect.fn("ProjectStore.getAttachment")(function* run(
        ...args: Parameters<StudioProjectStore["getAttachment"]>
      ) {
        return yield* attemptProject((store) => store.getAttachment(...args));
      }),
      list: Effect.fn("ProjectStore.list")(function* run() {
        const scope = yield* LocalOrgScope;
        const projects = yield* attemptProject((store) => store.list());
        const orgs = yield* readProjectOrgs();

        return toVisibleProjects(scope, orgs, projects);
      }),
      readDesignMd: Effect.fn("ProjectStore.readDesignMd")(function* run(
        projectId: string
      ) {
        yield* requireInScope(projectId);

        return yield* attemptProject((store) => store.readDesignMd(projectId));
      }),
    })
  );
}

export { ProjectStore };

export type { ProjectStoreApi };
