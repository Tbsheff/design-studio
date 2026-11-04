import { Context, Effect, Layer } from "effect";

import type { BadRequest } from "@design-studio/actions/_core/errors/bad-request";
import type { NotFound } from "@design-studio/actions/_core/errors/not-found";
import type { RepoContextState } from "../../shared/repo-context.js";
import type { RunPage } from "./run-list.js";
import { getRunContext, getRunDetail, listRunPage } from "./run-log-reads.js";
import type { RunDetail, RunListInput } from "./run-log-reads.js";

interface RunLogStoreApi {
  readonly context: (
    projectId: string,
    directionId: string
  ) => Effect.Effect<RepoContextState, NotFound>;
  readonly get: (
    projectId: string,
    runId: string
  ) => Effect.Effect<RunDetail, NotFound>;
  readonly list: (
    projectId: string,
    input: RunListInput
  ) => Effect.Effect<RunPage, BadRequest | NotFound>;
}

class RunLogStore extends Context.Service<RunLogStore, RunLogStoreApi>()(
  "design-studio/run-log/RunLogStore"
) {
  declare public readonly access: "read";

  public static readonly layer = Layer.succeed(
    RunLogStore,
    RunLogStore.of({
      context: Effect.fn("RunLogStore.context")(function* run(
        projectId: string,
        directionId: string
      ) {
        return yield* getRunContext(projectId, directionId);
      }),
      get: Effect.fn("RunLogStore.get")(function* run(
        projectId: string,
        runId: string
      ) {
        return yield* getRunDetail(projectId, runId);
      }),
      list: Effect.fn("RunLogStore.list")(function* run(
        projectId: string,
        input: RunListInput
      ) {
        return yield* listRunPage(projectId, input);
      }),
    })
  );
}

export { RunLogStore };

export type { RunLogStoreApi };
