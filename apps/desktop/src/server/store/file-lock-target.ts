import { NotFound } from "@design-studio/actions/_core/errors/not-found";
import { Effect } from "effect";

import { readProjectRuntime } from "./project-runtime.js";

interface FileLockTarget {
  readonly directionId: string;
  readonly projectDir: string;
}

interface FileLockProject {
  readonly directions: readonly { readonly id: string }[];
  readonly id: string;
}

const toFileLockTarget = Effect.fn("FileLockTarget.get")(function* run(
  project: FileLockProject,
  directionId: string
) {
  if (!project.directions.some((direction) => direction.id === directionId)) {
    return yield* new NotFound({
      message: `No direction ${directionId} in this project. Call list_projects for the ids.`,
    });
  }

  const runtime = yield* readProjectRuntime;

  return { directionId, projectDir: runtime.projectDir(project.id) };
});

export { toFileLockTarget };

export type { FileLockTarget };
