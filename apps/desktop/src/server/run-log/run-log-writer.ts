import { Context, Effect, Layer, Semaphore } from "effect";

import type { BadRequest } from "../../shared/actions/_core/errors/bad-request.js";
import type { Conflict } from "../../shared/actions/_core/errors/conflict.js";
import type { NotFound } from "../../shared/actions/_core/errors/not-found.js";
import type { RunSummary } from "../../shared/actions/_core/contracts.js";
import {
  answerActiveRun,
  setActiveQueue,
  setRunTitle,
  startRunWith,
  steerActiveRun,
  stopActiveRun,
} from "./run-log-controls.js";
import type {
  PermissionAnswer,
  QueueItems,
  RunAck,
} from "./run-log-controls.js";
import type { StartRunCall } from "./run-log-runtime.js";

type WriteFailure = BadRequest | Conflict | NotFound;

interface RunLogWriterApi {
  readonly answer: (
    projectId: string,
    runId: string,
    requestId: string,
    answer: PermissionAnswer
  ) => Effect.Effect<RunAck, NotFound>;
  readonly rename: (
    projectId: string,
    runId: string,
    title: string
  ) => Effect.Effect<RunSummary, WriteFailure>;
  readonly setQueue: (
    projectId: string,
    runId: string,
    items: QueueItems
  ) => Effect.Effect<RunAck, Conflict | NotFound>;
  readonly start: (
    input: StartRunCall
  ) => Effect.Effect<{ readonly runId: string }, WriteFailure>;
  readonly steer: (
    projectId: string,
    runId: string,
    text: string
  ) => Effect.Effect<RunAck, WriteFailure>;
  readonly stop: (
    projectId: string,
    runId: string
  ) => Effect.Effect<RunAck, NotFound>;
}

class RunLogWriter extends Context.Service<RunLogWriter, RunLogWriterApi>()(
  "design-studio/run-log/RunLogWriter"
) {
  declare public readonly access: "write";

  public static readonly layer = Layer.effect(
    RunLogWriter,
    Effect.gen(function* build() {
      const titleLock = yield* Semaphore.make(1);

      return RunLogWriter.of({
        answer: Effect.fn("RunLogWriter.answer")(function* run(
          projectId: string,
          runId: string,
          requestId: string,
          answer: PermissionAnswer
        ) {
          return yield* answerActiveRun(projectId, runId, requestId, answer);
        }),
        rename: Effect.fn("RunLogWriter.rename")(function* run(
          projectId: string,
          runId: string,
          title: string
        ) {
          return yield* titleLock.withPermits(1)(
            setRunTitle(projectId, runId, title)
          );
        }),
        setQueue: Effect.fn("RunLogWriter.setQueue")(function* run(
          projectId: string,
          runId: string,
          items: QueueItems
        ) {
          return yield* setActiveQueue(projectId, runId, items);
        }),
        start: Effect.fn("RunLogWriter.start")(function* run(
          input: StartRunCall
        ) {
          return yield* startRunWith(input);
        }),
        steer: Effect.fn("RunLogWriter.steer")(function* run(
          projectId: string,
          runId: string,
          text: string
        ) {
          return yield* steerActiveRun(projectId, runId, text);
        }),
        stop: Effect.fn("RunLogWriter.stop")(function* run(
          projectId: string,
          runId: string
        ) {
          return yield* stopActiveRun(projectId, runId);
        }),
      });
    })
  );
}

export { RunLogWriter };

export type { RunLogWriterApi };
