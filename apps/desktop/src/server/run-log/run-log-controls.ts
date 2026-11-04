import { readFile } from "node:fs/promises";

import { BadRequest } from "@design-studio/actions/_core/errors/bad-request";
import { Conflict } from "@design-studio/actions/_core/errors/conflict";
import { NotFound } from "@design-studio/actions/_core/errors/not-found";
import type {
  AckSchema,
  QueueItemsSchema,
} from "@design-studio/actions/run/schema";
import type { PermissionDecision, RunSummary } from "@design-studio/contracts";
import { Effect } from "effect";

import { RUN_TITLE_MAX } from "../../shared/rewind.js";
import { writeAtomic } from "../platform/atomic-write/index.js";
import { attemptKnown } from "../platform/attempt/index.js";
import { findRunFile } from "./run-log-reads.js";
import { readRunLogRuntime } from "./run-log-runtime.js";
import type { ActiveRun, StartRunCall } from "./run-log-runtime.js";

type RunAck = typeof AckSchema.Type;

type QueueItems = typeof QueueItemsSchema.Type;

interface PermissionAnswer {
  readonly allow: boolean;
  readonly always?: string;
  readonly note?: string;
}

const ACK: RunAck = { ok: true };

const JSON_INDENT = 2;

const findActiveRun = Effect.fn("RunLog.findActiveRun")(function* run(
  projectId: string,
  runId: string
) {
  const runtime = yield* readRunLogRuntime;

  yield* findRunFile(runtime, projectId, runId);

  const handle: ActiveRun | undefined = runtime.runner.get(runId);

  if (!handle) {
    return yield* new NotFound({ message: "The run is not active." });
  }

  return handle;
});

const runFinished = (): Conflict => new Conflict({ message: "run_finished" });

const stopActiveRun = Effect.fn("RunLog.stopActiveRun")(function* run(
  projectId: string,
  runId: string
) {
  const handle = yield* findActiveRun(projectId, runId);

  handle.cancel();

  return ACK;
});

const steerActiveRun = Effect.fn("RunLog.steerActiveRun")(function* run(
  projectId: string,
  runId: string,
  rawText: string
) {
  const text = rawText.trim();

  if (text === "") {
    return yield* new BadRequest({ message: "text is required" });
  }

  const handle = yield* findActiveRun(projectId, runId);

  if (!handle.steer?.(text)) {
    return yield* runFinished();
  }

  return ACK;
});

const setActiveQueue = Effect.fn("RunLog.setActiveQueue")(function* run(
  projectId: string,
  runId: string,
  items: QueueItems
) {
  const handle = yield* findActiveRun(projectId, runId);

  if (!handle.setQueue?.(items.map((item) => ({ ...item })))) {
    return yield* runFinished();
  }

  return ACK;
});

const toDecision = (answer: PermissionAnswer): PermissionDecision => {
  if (answer.allow) {
    if (answer.always) {
      return { allow: true, always: answer.always };
    }

    return { allow: true };
  }

  const note = answer.note?.trim() ?? "";

  if (note !== "") {
    return { allow: false, note };
  }

  return { allow: false };
};

const answerActiveRun = Effect.fn("RunLog.answerActiveRun")(function* run(
  projectId: string,
  runId: string,
  requestId: string,
  answer: PermissionAnswer
) {
  const handle = yield* findActiveRun(projectId, runId);

  if (!handle.answer?.(requestId, toDecision(answer))) {
    return yield* new NotFound({
      message: "The permission request is not open.",
    });
  }

  return ACK;
});

const withTitle = (current: RunSummary, title: string): RunSummary => {
  const next: RunSummary = { ...current };
  delete next.title;

  if (title !== "") {
    next.title = title;
  }

  return next;
};

const readSummary = (
  file: string,
  runId: string
): Effect.Effect<RunSummary, NotFound> => {
  const missing = new NotFound({
    message: `Run ${runId} is not in this project.`,
  });

  return Effect.tryPromise({
    catch: () => missing,
    try: () => readFile(file, "utf-8"),
  }).pipe(
    Effect.flatMap((text) =>
      Effect.try({
        catch: () => missing,
        try: () => JSON.parse(text) as RunSummary,
      })
    )
  );
};

const setRunTitle = Effect.fn("RunLog.setRunTitle")(function* run(
  projectId: string,
  runId: string,
  rawTitle: string
) {
  const title = rawTitle.trim();

  if (title.length > RUN_TITLE_MAX) {
    return yield* new BadRequest({
      message: `title is longer than ${RUN_TITLE_MAX}`,
    });
  }

  const runtime = yield* readRunLogRuntime;
  const base = yield* findRunFile(runtime, projectId, runId);
  const file = `${base}.json`;
  const current = yield* readSummary(file, runId);

  const isActive =
    current.status === "running" &&
    runtime.runner.isRunning(projectId, current.directionId);

  if (isActive) {
    return yield* new Conflict({ message: "run_in_progress" });
  }

  const next = withTitle(current, title);
  const text = `${JSON.stringify(next, null, JSON_INDENT)}\n`;

  yield* Effect.promise(() => writeAtomic(file, text));

  return next;
});

const startRunWith = Effect.fn("RunLog.startRunWith")(function* run(
  input: StartRunCall
) {
  const runtime = yield* readRunLogRuntime;
  const runId = yield* attemptKnown(() => runtime.startRun(input));

  return { runId };
});

export {
  answerActiveRun,
  setActiveQueue,
  setRunTitle,
  startRunWith,
  steerActiveRun,
  stopActiveRun,
};

export type { PermissionAnswer, QueueItems, RunAck };
