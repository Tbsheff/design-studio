import { Context, Effect, Layer } from "effect";

import type { RunSummary } from "../../shared/contracts.js";
import type { KnownFailure } from "../platform/attempt/index.js";
import {
  answerPermission,
  renameRun,
  setRunQueue,
  startRunCall,
  steerRun,
  stopRun,
} from "./run-log-controls.js";
import { attemptRunLog } from "./run-log-runtime.js";
import type { Decision, StartRunCall } from "./run-log-runtime.js";

interface RunAck {
  readonly ok: boolean;
}

interface RunLogWriterApi {
  readonly answer: (
    runId: string,
    requestId: string,
    answer: Decision
  ) => Effect.Effect<RunAck, KnownFailure>;
  readonly rename: (
    runId: string,
    title: string
  ) => Effect.Effect<RunSummary, KnownFailure>;
  readonly setQueue: (
    runId: string,
    items: readonly { id: string; text: string }[]
  ) => Effect.Effect<RunAck, KnownFailure>;
  readonly start: (
    input: StartRunCall
  ) => Effect.Effect<{ runId: string }, KnownFailure>;
  readonly steer: (
    runId: string,
    text: string
  ) => Effect.Effect<RunAck, KnownFailure>;
  readonly stop: (runId: string) => Effect.Effect<RunAck, KnownFailure>;
}

class RunLogWriter extends Context.Service<RunLogWriter, RunLogWriterApi>()(
  "design-studio/run-log/RunLogWriter"
) {
  declare public readonly access: "write";

  public static readonly layer = Layer.succeed(
    RunLogWriter,
    RunLogWriter.of({
      answer: Effect.fn("RunLogWriter.answer")(function* run(
        runId: string,
        requestId: string,
        answer: Decision
      ) {
        return yield* attemptRunLog((runtime) =>
          Promise.resolve(answerPermission(runtime, runId, requestId, answer))
        );
      }),
      rename: Effect.fn("RunLogWriter.rename")(function* run(
        runId: string,
        title: string
      ) {
        return yield* attemptRunLog((runtime) =>
          renameRun(runtime, runId, title)
        );
      }),
      setQueue: Effect.fn("RunLogWriter.setQueue")(function* run(
        runId: string,
        items: readonly { id: string; text: string }[]
      ) {
        return yield* attemptRunLog((runtime) =>
          Promise.resolve(setRunQueue(runtime, runId, items))
        );
      }),
      start: Effect.fn("RunLogWriter.start")(function* run(
        input: StartRunCall
      ) {
        return yield* attemptRunLog((runtime) => startRunCall(runtime, input));
      }),
      steer: Effect.fn("RunLogWriter.steer")(function* run(
        runId: string,
        text: string
      ) {
        return yield* attemptRunLog((runtime) =>
          Promise.resolve(steerRun(runtime, runId, text))
        );
      }),
      stop: Effect.fn("RunLogWriter.stop")(function* run(runId: string) {
        return yield* attemptRunLog((runtime) =>
          Promise.resolve(stopRun(runtime, runId))
        );
      }),
    })
  );
}

export { RunLogWriter };
