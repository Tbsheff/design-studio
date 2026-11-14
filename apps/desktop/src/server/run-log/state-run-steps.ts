import type { BadRequest } from "@design-studio/actions/_core/errors/bad-request";
import type { Conflict } from "@design-studio/actions/_core/errors/conflict";
import type { NotFound } from "@design-studio/actions/_core/errors/not-found";
import type { StateRunItem } from "@design-studio/actions/run/states/schema";
import { Effect, Result, Schedule } from "effect";

import {
  toItemPatch,
  toNextStateIndex,
  toRunEndStatus,
  toStoppedRest,
} from "./engine/to-next-state.js";
import { getRunDetail } from "./run-log-reads.js";
import { readRunLogRuntime } from "./run-log-runtime.js";
import { getStateRun, setStateRun } from "./state-run-map.js";

interface StateRunPort {
  readonly directionId: string;
  readonly isStillSame: (frameId: string) => Effect.Effect<boolean>;
  readonly notify: Effect.Effect<void>;
  readonly startRun: (
    item: StateRunItem
  ) => Effect.Effect<string, BadRequest | Conflict | NotFound>;
}

interface StateRunCall {
  readonly port: StateRunPort;
  readonly projectId: string;
  readonly sequenceId: string;
}

const RUN_POLL = "250 millis";

const START_PAUSE = "200 millis";

const START_TRIES = 10;

const MISSING_POLLS = 40;

const MAX_POLLS = 100_000;

const RUNNING = "running";

const updateItem = (
  call: StateRunCall,
  index: number,
  patch: Partial<StateRunItem>
): Effect.Effect<void> =>
  Effect.sync(() => {
    const found = getStateRun(call.projectId, call.sequenceId);

    if (found !== null) {
      setStateRun(call.projectId, {
        ...found,
        items: toItemPatch(found.items, index, patch),
      });
    }
  });

const stopSequenceRest = (call: StateRunCall): Effect.Effect<void> =>
  Effect.sync(() => {
    const found = getStateRun(call.projectId, call.sequenceId);

    if (found !== null) {
      setStateRun(call.projectId, {
        ...found,
        items: toStoppedRest(found.items),
      });
    }
  });

const getItem = (
  call: StateRunCall,
  index: number
): Effect.Effect<StateRunItem | null> =>
  Effect.sync(
    () => getStateRun(call.projectId, call.sequenceId)?.items[index] ?? null
  );

const getNextIndex = (
  call: StateRunCall,
  after: number
): Effect.Effect<number | null> =>
  Effect.sync(() => {
    const found = getStateRun(call.projectId, call.sequenceId);

    if (found === null) {
      return null;
    }

    return toNextStateIndex(found.items, after);
  });

const getRunStatus = Effect.fn("StateRun.getRunStatus")(function* run(
  call: StateRunCall,
  runId: string
) {
  const runtime = yield* readRunLogRuntime;

  if (runtime.runner.isRunning(call.projectId, call.port.directionId)) {
    return RUNNING;
  }

  const detail = yield* getRunDetail(call.projectId, runId).pipe(
    Effect.orElseSucceed(() => null)
  );

  return detail?.summary?.status ?? null;
});

const getRunEndStatus = Effect.fn("StateRun.getRunEndStatus")(function* run(
  call: StateRunCall,
  runId: string
) {
  let missing = 0;

  for (let poll = 0; poll < MAX_POLLS; poll += 1) {
    yield* Effect.sleep(RUN_POLL);

    const status = yield* getRunStatus(call, runId);

    if (status === null) {
      missing += 1;
    }

    if (status !== null && status !== RUNNING) {
      return status;
    }

    if (missing > MISSING_POLLS) {
      return "failed";
    }
  }

  return "failed";
});

const startItemRun = (
  port: StateRunPort,
  item: StateRunItem
): Effect.Effect<string, BadRequest | Conflict | NotFound> =>
  port.startRun(item).pipe(
    Effect.retry({
      schedule: Schedule.spaced(START_PAUSE),
      times: START_TRIES,
      while: (error) => error._tag === "Conflict",
    })
  );

const setStepEnd = Effect.fn("StateRun.setStepEnd")(function* run(
  call: StateRunCall,
  index: number,
  status: "failed" | "stopped"
) {
  yield* updateItem(call, index, { status });
  yield* stopSequenceRest(call);
  yield* call.port.notify;

  return false;
});

const isStillWaiting = Effect.fn("StateRun.isStillWaiting")(function* run(
  call: StateRunCall,
  index: number,
  isFirst: boolean
) {
  const item = yield* getItem(call, index);

  if (item === null || item.status !== "waiting") {
    return false;
  }

  if (isFirst) {
    return true;
  }

  const isSame = yield* call.port.isStillSame(item.frameId);

  if (!isSame) {
    yield* updateItem(call, index, { status: "skipped" });
    yield* call.port.notify;

    return false;
  }

  const again = yield* getItem(call, index);

  return again?.status === "waiting";
});

const runStep = Effect.fn("StateRun.runStep")(function* run(
  call: StateRunCall,
  index: number,
  isFirst: boolean
) {
  const isWaiting = yield* isStillWaiting(call, index, isFirst);
  const item = yield* getItem(call, index);

  if (!isWaiting || item === null) {
    return true;
  }

  const started = yield* Effect.result(startItemRun(call.port, item));

  if (Result.isFailure(started)) {
    return yield* setStepEnd(call, index, "failed");
  }

  const runId = started.success;

  yield* updateItem(call, index, { runId, status: "running" });
  yield* call.port.notify;

  const end = toRunEndStatus(yield* getRunEndStatus(call, runId));

  if (end !== "done") {
    return yield* setStepEnd(call, index, end);
  }

  yield* updateItem(call, index, { status: "done" });
  yield* call.port.notify;

  return true;
});

const runStateSequence = Effect.fn("StateRun.runStateSequence")(function* run(
  call: StateRunCall
) {
  let index = yield* getNextIndex(call, -1);
  let isFirst = true;

  while (index !== null) {
    const isGoing = yield* runStep(call, index, isFirst);

    if (!isGoing) {
      return;
    }

    isFirst = false;
    index = yield* getNextIndex(call, index);
  }
});

export { runStateSequence };

export type { StateRunCall, StateRunPort };
