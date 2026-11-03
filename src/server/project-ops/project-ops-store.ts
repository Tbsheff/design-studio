import { Context, Effect, Layer } from "effect";

import type { KnownFailure } from "../platform/attempt/index.js";
import { listCommandRulesIn, readProjectFileIn } from "./project-ops-detail.js";
import { countHiddenIn } from "./project-ops-hidden.js";
import { attemptProjectOps } from "./project-ops-runtime.js";

interface ProjectOpsStoreApi {
  readonly countHidden: () => Effect.Effect<
    Awaited<ReturnType<typeof countHiddenIn>>,
    KnownFailure
  >;
  readonly listCommandRules: (
    projectId: string
  ) => Effect.Effect<
    Awaited<ReturnType<typeof listCommandRulesIn>>,
    KnownFailure
  >;
  readonly readFile: (
    projectId: string,
    requested: string
  ) => Effect.Effect<
    Awaited<ReturnType<typeof readProjectFileIn>>,
    KnownFailure
  >;
}

class ProjectOpsStore extends Context.Service<
  ProjectOpsStore,
  ProjectOpsStoreApi
>()("design-studio/project-ops/ProjectOpsStore") {
  declare public readonly access: "read";

  public static readonly layer = Layer.succeed(
    ProjectOpsStore,
    ProjectOpsStore.of({
      countHidden: Effect.fn("ProjectOpsStore.countHidden")(function* run() {
        return yield* attemptProjectOps((runtime) => countHiddenIn(runtime));
      }),
      listCommandRules: Effect.fn("ProjectOpsStore.listCommandRules")(
        function* run(projectId: string) {
          return yield* attemptProjectOps((runtime) =>
            listCommandRulesIn(runtime, projectId)
          );
        }
      ),
      readFile: Effect.fn("ProjectOpsStore.readFile")(function* run(
        projectId: string,
        requested: string
      ) {
        return yield* attemptProjectOps((runtime) =>
          readProjectFileIn(runtime, projectId, requested)
        );
      }),
    })
  );
}

export { ProjectOpsStore };

export type { ProjectOpsStoreApi };
