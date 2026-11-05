import { readFile } from "node:fs/promises";
import path from "node:path";

import { BadRequest } from "@design-studio/actions/_core/errors/bad-request";
import { NotFound } from "@design-studio/actions/_core/errors/not-found";
import type {
  RunSentRecord,
  RunSummary,
  StudioEvent,
} from "@design-studio/contracts";
import { Effect } from "effect";

import { runQueryTerms } from "../../shared/rewind.js";
import { attemptKnown } from "../platform/attempt/index.js";
import type { KnownFailure } from "../platform/attempt/index.js";
import { listRunSummaries, pageRuns } from "./run-list.js";
import { isRunLogRecord, isRunSummary } from "./run-log-json.js";
import { readRunLogRuntime } from "./run-log-runtime.js";
import type { RunLogRuntime } from "./run-log-runtime.js";

interface RunListInput {
  readonly cursor: string | null;
  readonly direction?: string;
  readonly light?: boolean;
  readonly limit: number;
  readonly q?: string;
}

interface RunDetail {
  readonly events: StudioEvent[];
  readonly sent: RunSentRecord[];
  readonly summary: RunSummary | null;
}

const readOptional = (file: string): Effect.Effect<string | null> =>
  Effect.tryPromise({
    catch: (error) => ({
      isMissing:
        error instanceof Error && "code" in error && error.code === "ENOENT",
    }),
    try: () => readFile(file, "utf-8"),
  }).pipe(
    Effect.catchIf(
      (failure) => failure.isMissing,
      () => Effect.succeed(null)
    ),
    Effect.orDie
  );

const parseLines = (text: string): (StudioEvent | RunSentRecord)[] =>
  text
    .split("\n")
    .filter((line) => line.trim() !== "")
    .map((line) => JSON.parse(line))
    .filter((record) => isRunLogRecord(record));

const parseSummary = (text: string | null): RunSummary | null => {
  if (text === null) {
    return null;
  }

  const parsed = JSON.parse(text);

  if (isRunSummary(parsed)) {
    return parsed;
  }

  return null;
};

const missingRun = (runId: string): NotFound =>
  new NotFound({ message: `Run ${runId} is not in this project.` });

const findRunFile = Effect.fn("RunLog.findRunFile")(function* run(
  runtime: RunLogRuntime,
  projectId: string,
  runId: string
) {
  const owner = yield* Effect.promise(() => runtime.findRunProject(runId));

  if (owner !== projectId) {
    return yield* missingRun(runId);
  }

  return path.join(runtime.runsDir(projectId), runId);
});

const toRunDetail = (
  summaryText: string | null,
  eventsText: string | null
): RunDetail => {
  const lines = parseLines(eventsText ?? "");

  const sent = lines.filter(
    (line): line is RunSentRecord => line.type === "run.sent"
  );

  const events = lines.filter(
    (line): line is StudioEvent => line.type !== "run.sent"
  );

  return { events, sent, summary: parseSummary(summaryText) };
};

const getRunDetail = Effect.fn("RunLog.getRunDetail")(function* run(
  projectId: string,
  runId: string
) {
  const runtime = yield* readRunLogRuntime;
  const base = yield* findRunFile(runtime, projectId, runId);

  const [summaryText, eventsText] = yield* Effect.all([
    readOptional(`${base}.json`),
    readOptional(`${base}.jsonl`),
  ]);

  if (summaryText === null && eventsText === null) {
    return yield* missingRun(runId);
  }

  return toRunDetail(summaryText, eventsText);
});

const CURSOR = /^\d{1,16}$/u;

const toBefore = (cursor: string | null): number | null => {
  if (cursor === null) {
    return null;
  }

  return Number(cursor);
};

const onlyNotFound = <Value>(
  effect: Effect.Effect<Value, KnownFailure>
): Effect.Effect<Value, NotFound> =>
  effect.pipe(
    Effect.catchTag("BadRequest", Effect.die),
    Effect.catchTag("Conflict", Effect.die)
  );

const listRunPage = Effect.fn("RunLog.listRunPage")(function* run(
  projectId: string,
  input: RunListInput
) {
  const runtime = yield* readRunLogRuntime;

  if (input.cursor !== null && !CURSOR.test(input.cursor)) {
    return yield* new BadRequest({
      message: "cursor must be the next value of an earlier page.",
    });
  }

  yield* onlyNotFound(attemptKnown(() => runtime.projects.get(projectId)));

  const all = yield* Effect.promise(() =>
    listRunSummaries(runtime.runsDir(projectId))
  );

  return pageRuns(all, {
    before: toBefore(input.cursor),
    directionId: input.direction ?? null,
    isLight: input.light === true,
    limit: input.limit,
    terms: runQueryTerms(input.q ?? ""),
  });
});

const getRunContext = Effect.fn("RunLog.getRunContext")(function* run(
  projectId: string,
  directionId: string
) {
  const runtime = yield* readRunLogRuntime;

  const loaded = yield* onlyNotFound(
    attemptKnown(() => runtime.loadDirection(projectId, directionId))
  );

  return yield* Effect.promise(() =>
    runtime.loadContext(loaded.project, loaded.direction.workTree)
  );
});

export { findRunFile, getRunContext, getRunDetail, listRunPage, onlyNotFound };

export type { RunDetail, RunListInput };
