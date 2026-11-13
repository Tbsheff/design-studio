import type { RunDraft } from "@design-studio/actions/run/draft/schema";
import { Context, Effect, Layer } from "effect";

import { toRunDraft } from "./run-draft-map.js";

interface RunDraftStoreApi {
  readonly get: (
    projectId: string,
    runId: string
  ) => Effect.Effect<RunDraft | null>;
}

class RunDraftStore extends Context.Service<RunDraftStore, RunDraftStoreApi>()(
  "design-studio/run-log/RunDraftStore"
) {
  declare public readonly access: "read";

  public static readonly layer = Layer.succeed(
    RunDraftStore,
    RunDraftStore.of({
      get: Effect.fn("RunDraftStore.get")(function* run(
        projectId: string,
        runId: string
      ) {
        return yield* Effect.sync(() => toRunDraft(projectId, runId));
      }),
    })
  );
}

export { RunDraftStore };

export type { RunDraftStoreApi };
