import type { NotFound } from "@design-studio/actions/_core/errors/not-found";
import type { Decision } from "@design-studio/actions/run/decision/schema";
import { Context, Effect, Layer } from "effect";

import {
  getDecisionFile,
  listDecisionRecords,
  toMissingDecision,
  toWireDecision,
} from "./run-decision-file.js";
import type { DecisionRecord } from "./run-decision-file.js";

interface RunDecisionStoreApi {
  readonly get: (
    projectId: string,
    runId: string,
    decisionId: string
  ) => Effect.Effect<DecisionRecord, NotFound>;
  readonly list: (
    projectId: string,
    runId: string
  ) => Effect.Effect<readonly Decision[], NotFound>;
}

class RunDecisionStore extends Context.Service<
  RunDecisionStore,
  RunDecisionStoreApi
>()("design-studio/run-log/RunDecisionStore") {
  declare public readonly access: "read";

  public static readonly layer = Layer.succeed(
    RunDecisionStore,
    RunDecisionStore.of({
      get: Effect.fn("RunDecisionStore.get")(function* run(
        projectId: string,
        runId: string,
        decisionId: string
      ) {
        const file = yield* getDecisionFile(projectId, runId);
        const records = yield* Effect.promise(() => listDecisionRecords(file));
        const found = records.find((record) => record.id === decisionId);

        if (!found) {
          return yield* toMissingDecision(decisionId);
        }

        return found;
      }),
      list: Effect.fn("RunDecisionStore.list")(function* run(
        projectId: string,
        runId: string
      ) {
        const file = yield* getDecisionFile(projectId, runId);
        const records = yield* Effect.promise(() => listDecisionRecords(file));

        return records.map((record) => toWireDecision(record));
      }),
    })
  );
}

export { RunDecisionStore };

export type { RunDecisionStoreApi };
