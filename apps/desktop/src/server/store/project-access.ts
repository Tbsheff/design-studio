import { stat } from "node:fs/promises";
import path from "node:path";

import { Context, Effect, Layer } from "effect";

import { NotFound } from "@design-studio/actions/_core/errors/not-found";
import { loadConfig } from "../platform/config/index.js";

interface ProjectAccessApi {
  readonly visible: (projectId: string) => Effect.Effect<void, NotFound>;
}

const SAFE_ID = /^[\w-]{1,64}$/u;

const MISS_MESSAGE = "The project does not exist.";

const createProjectAccess = (projectsRoot: string): ProjectAccessApi => {
  const hasProjectFile = (projectId: string): Effect.Effect<boolean> =>
    Effect.tryPromise(() =>
      stat(path.join(projectsRoot, projectId, "project.json"))
    ).pipe(
      Effect.map((found) => found.isFile()),
      Effect.orElseSucceed(() => false)
    );

  const visible = Effect.fn("ProjectAccess.visible")(function* run(
    projectId: string
  ) {
    if (!SAFE_ID.test(projectId)) {
      return yield* new NotFound({ message: MISS_MESSAGE });
    }

    const isFound = yield* hasProjectFile(projectId);

    if (!isFound) {
      return yield* new NotFound({ message: MISS_MESSAGE });
    }
  });

  return { visible };
};

class ProjectAccess extends Context.Service<ProjectAccess, ProjectAccessApi>()(
  "design-studio/store/ProjectAccess"
) {
  declare public readonly access: "read";

  public static readonly layer = Layer.sync(ProjectAccess, () => {
    const projectsRoot = path.join(loadConfig().dataDir, "projects");

    return ProjectAccess.of(createProjectAccess(projectsRoot));
  });
}

export { ProjectAccess };

export type { ProjectAccessApi };
