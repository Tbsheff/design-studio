import { Conflict } from "@design-studio/actions/_core/errors/conflict";
import type {
  StateRun,
  StateRunItem,
} from "@design-studio/actions/run/states/schema";
import { Context, Effect, Layer } from "effect";

import {
  isStateRunActive,
  setStateRun,
  stopStateRunOf,
} from "./state-run-map.js";
import { runStateSequence } from "./state-run-steps.js";
import type { StateRunPort } from "./state-run-steps.js";

interface StateRunStart {
  readonly items: readonly StateRunItem[];
  readonly port: StateRunPort;
  readonly projectId: string;
  readonly section: string;
  readonly sequenceId: string;
}

interface StateRunQueueApi {
  readonly start: (input: StateRunStart) => Effect.Effect<StateRun, Conflict>;
  readonly stopOf: (projectId: string, runId: string) => Effect.Effect<boolean>;
}

class StateRunQueue extends Context.Service<StateRunQueue, StateRunQueueApi>()(
  "design-studio/run-log/StateRunQueue"
) {
  declare public readonly access: "write";

  public static readonly layer = Layer.succeed(
    StateRunQueue,
    StateRunQueue.of({
      start: Effect.fn("StateRunQueue.start")(function* run(
        input: StateRunStart
      ) {
        const { port, projectId, section, sequenceId } = input;

        if (isStateRunActive(projectId, sequenceId)) {
          return yield* new Conflict({
            message: `The states of section ${section} are already in design. Read them with get_states_run, or stop the current run with stop_run.`,
          });
        }

        const created: StateRun = {
          items: [...input.items],
          section,
          sequenceId,
        };

        setStateRun(projectId, created);

        yield* Effect.forkDetach(
          runStateSequence({ port, projectId, sequenceId })
        );

        return created;
      }),
      stopOf: Effect.fn("StateRunQueue.stopOf")(function* run(
        projectId: string,
        runId: string
      ) {
        return yield* Effect.sync(() => stopStateRunOf(projectId, runId));
      }),
    })
  );
}

export { StateRunQueue };

export type { StateRunQueueApi, StateRunStart };
