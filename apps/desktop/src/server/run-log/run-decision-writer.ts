import type { BadRequest } from "@design-studio/actions/_core/errors/bad-request";
import type { NotFound } from "@design-studio/actions/_core/errors/not-found";
import type { Decision } from "@design-studio/actions/run/decision/schema";
import { Context, Effect, Layer, Semaphore } from "effect";

import { writeAtomic } from "../platform/atomic-write/index.js";
import {
  getDecisionFile,
  listDecisionRecords,
  toCreatedRecords,
  toDecisionJson,
  toDecisionRunId,
  toPickedRecords,
} from "./run-decision-file.js";
import type {
  DecisionCreateCall,
  DecisionPickCall,
} from "./run-decision-file.js";

const createDecisionRecord = Effect.fn("RunLog.createDecisionRecord")(
  function* run(call: DecisionCreateCall) {
    const runId = yield* toDecisionRunId(call);
    const file = yield* getDecisionFile(call.projectId, runId);
    const records = yield* Effect.promise(() => listDecisionRecords(file));
    const change = toCreatedRecords(records, { ...call, runId });

    if (!("records" in change)) {
      return yield* change;
    }

    yield* Effect.promise(() =>
      writeAtomic(file, toDecisionJson(change.records), { createDir: true })
    );

    return change.decision;
  }
);

const setDecisionPick = Effect.fn("RunLog.setDecisionPick")(function* run(
  pick: DecisionPickCall
) {
  const file = yield* getDecisionFile(pick.projectId, pick.runId);
  const records = yield* Effect.promise(() => listDecisionRecords(file));

  const change = toPickedRecords(
    records,
    pick.decisionId,
    pick.option,
    pick.result
  );

  if (!("records" in change)) {
    return yield* change;
  }

  yield* Effect.promise(() =>
    writeAtomic(file, toDecisionJson(change.records), { createDir: true })
  );

  return change.decision;
});

interface RunDecisionWriterApi {
  readonly create: (
    call: DecisionCreateCall
  ) => Effect.Effect<Decision, BadRequest | NotFound>;
  readonly pick: (pick: DecisionPickCall) => Effect.Effect<Decision, NotFound>;
}

class RunDecisionWriter extends Context.Service<
  RunDecisionWriter,
  RunDecisionWriterApi
>()("design-studio/run-log/RunDecisionWriter") {
  declare public readonly access: "write";

  public static readonly layer = Layer.effect(
    RunDecisionWriter,
    Effect.gen(function* make() {
      const lock = yield* Semaphore.make(1);

      return RunDecisionWriter.of({
        create: Effect.fn("RunDecisionWriter.create")(function* run(
          call: DecisionCreateCall
        ) {
          return yield* lock.withPermits(1)(createDecisionRecord(call));
        }),
        pick: Effect.fn("RunDecisionWriter.pick")(function* run(
          pick: DecisionPickCall
        ) {
          return yield* lock.withPermits(1)(setDecisionPick(pick));
        }),
      });
    })
  );
}

export { RunDecisionWriter };

export type { RunDecisionWriterApi };
