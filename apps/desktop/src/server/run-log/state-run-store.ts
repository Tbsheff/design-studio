import { NotFound } from "@design-studio/actions/_core/errors/not-found";
import type { StateRun } from "@design-studio/actions/run/states/schema";
import { Context, Effect, Layer } from "effect";

import { getStateRun, isStateRunActive } from "./state-run-map.js";

interface StateRunStoreApi {
  readonly get: (
    projectId: string,
    sequenceId: string
  ) => Effect.Effect<StateRun, NotFound>;
  readonly isActive: (
    projectId: string,
    sequenceId: string
  ) => Effect.Effect<boolean>;
}

class StateRunStore extends Context.Service<StateRunStore, StateRunStoreApi>()(
  "design-studio/run-log/StateRunStore"
) {
  declare public readonly access: "read";

  public static readonly layer = Layer.succeed(
    StateRunStore,
    StateRunStore.of({
      get: Effect.fn("StateRunStore.get")(function* run(
        projectId: string,
        sequenceId: string
      ) {
        const found = getStateRun(projectId, sequenceId);

        if (found === null) {
          return yield* new NotFound({
            message: `No state sequence ${sequenceId}. Start one with start_states_run. A server restart drops the sequences.`,
          });
        }

        return found;
      }),
      isActive: Effect.fn("StateRunStore.isActive")(function* run(
        projectId: string,
        sequenceId: string
      ) {
        return yield* Effect.sync(() =>
          isStateRunActive(projectId, sequenceId)
        );
      }),
    })
  );
}

export { StateRunStore };

export type { StateRunStoreApi };
