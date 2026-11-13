import { readFile } from "node:fs/promises";
import path from "node:path";

import { BadRequest } from "@design-studio/actions/_core/errors/bad-request";
import { NotFound } from "@design-studio/actions/_core/errors/not-found";
import {
  CURRENT_RUN,
  DecisionPickSchema,
  DecisionSchema,
  OPTIONS_MAX,
} from "@design-studio/actions/run/decision/schema";
import type { Decision } from "@design-studio/actions/run/decision/schema";
import { Effect, Schema } from "effect";

import { listRunSummaries } from "./run-list.js";
import { findRunFile } from "./run-log-reads.js";
import { readRunLogRuntime } from "./run-log-runtime.js";

const RUN_DECISIONS_MAX = 3;

const OPTIONS_MIN = 2;

const DecisionRecordSchema = Schema.Struct({
  ...DecisionSchema.fields,
  result: Schema.NullOr(DecisionPickSchema),
});

const DecisionRecordsSchema = Schema.Array(DecisionRecordSchema);

const isDecisionRecords = Schema.is(DecisionRecordsSchema);

type DecisionRecord = typeof DecisionRecordSchema.Type;

type DecisionPick = typeof DecisionPickSchema.Type;

interface DecisionCreateCall {
  readonly chosen: string;
  readonly directionId: string | null;
  readonly options: readonly string[];
  readonly projectId: string;
  readonly runId: string;
  readonly topic: string;
}

interface DecisionPickCall {
  readonly decisionId: string;
  readonly option: string;
  readonly projectId: string;
  readonly result: DecisionPick;
  readonly runId: string;
}

interface DecisionChange {
  readonly decision: Decision;
  readonly records: readonly DecisionRecord[];
}

const getDecisionText = async (file: string): Promise<string | null> => {
  try {
    return await readFile(file, "utf-8");
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return null;
    }

    throw error;
  }
};

const toDecisionRecords = (text: string | null): readonly DecisionRecord[] => {
  if (text === null) {
    return [];
  }

  const parsed: unknown = JSON.parse(text);

  if (isDecisionRecords(parsed)) {
    return parsed;
  }

  return [];
};

const listDecisionRecords = async (
  file: string
): Promise<readonly DecisionRecord[]> =>
  toDecisionRecords(await getDecisionText(file));

const toWireDecision = (record: DecisionRecord): Decision => ({
  chosen: record.chosen,
  id: record.id,
  options: record.options,
  picked: record.picked,
  topic: record.topic,
});

const getDecisionFile = Effect.fn("RunLog.getDecisionFile")(function* run(
  projectId: string,
  runId: string
) {
  const runtime = yield* readRunLogRuntime;
  const base = yield* findRunFile(runtime, projectId, runId);

  return path.join(path.dirname(base), "decisions", `${runId}.json`);
});

const toNoActiveRun = (): BadRequest =>
  new BadRequest({
    message: "No run is active in this direction. Pass the run id.",
  });

const getActiveRunId = Effect.fn("RunLog.getActiveRunId")(function* run(
  projectId: string,
  directionId: string
) {
  const runtime = yield* readRunLogRuntime;

  if (!runtime.runner.isRunning(projectId, directionId)) {
    return yield* toNoActiveRun();
  }

  const summaries = yield* Effect.promise(() =>
    listRunSummaries(runtime.runsDir(projectId))
  );

  const active = summaries
    .filter(
      (summary) =>
        summary.directionId === directionId &&
        summary.status === "running" &&
        Boolean(runtime.runner.get(summary.id))
    )
    .toSorted((left, right) => right.startedAt - left.startedAt);

  const [first] = active;

  if (!first) {
    return yield* toNoActiveRun();
  }

  return first.id;
});

const toDecisionRunId = Effect.fn("RunLog.toDecisionRunId")(function* run(
  call: DecisionCreateCall
) {
  if (call.runId !== CURRENT_RUN) {
    return call.runId;
  }

  if (call.directionId === null) {
    return yield* new BadRequest({
      message: "runId current needs a directionId. Pass the run id.",
    });
  }

  return yield* getActiveRunId(call.projectId, call.directionId);
});

const toDecisionOptions = (
  chosen: string,
  options: readonly string[]
): readonly string[] => {
  const rest = options.flatMap((option) => {
    const text = option.trim();

    if (text === "" || text === chosen) {
      return [];
    }

    return [text];
  });

  return [...new Set([chosen, ...rest])].slice(0, OPTIONS_MAX);
};

const toTopicKey = (topic: string): string => topic.trim().toLowerCase();

const toCreatedRecords = (
  records: readonly DecisionRecord[],
  call: DecisionCreateCall
): DecisionChange | BadRequest => {
  const chosen = call.chosen.trim();
  const topic = call.topic.trim();
  const options = toDecisionOptions(chosen, call.options);

  if (options.length < OPTIONS_MIN) {
    return new BadRequest({
      message: "Give 2 to 4 different options, with the chosen option.",
    });
  }

  const key = toTopicKey(topic);
  const found = records.find((record) => toTopicKey(record.topic) === key);

  if (found) {
    const next: DecisionRecord = { ...found, chosen, options, topic };

    return {
      decision: toWireDecision(next),
      records: records.map((record) => {
        if (record.id === found.id) {
          return next;
        }

        return record;
      }),
    };
  }

  if (records.length >= RUN_DECISIONS_MAX) {
    return new BadRequest({
      message: `This run already has ${RUN_DECISIONS_MAX} choices. Record only the main forks.`,
    });
  }

  const fields = { chosen, options, topic };

  const created: DecisionRecord = {
    ...fields,
    id: `d${records.length + 1}`,
    picked: null,
    result: null,
  };

  return { decision: toWireDecision(created), records: [...records, created] };
};

const toMissingDecision = (decisionId: string): NotFound =>
  new NotFound({ message: `Choice ${decisionId} is not in this run.` });

const toPickedRecords = (
  records: readonly DecisionRecord[],
  decisionId: string,
  option: string,
  result: DecisionPick
): DecisionChange | NotFound => {
  const found = records.find((record) => record.id === decisionId);

  if (!found) {
    return toMissingDecision(decisionId);
  }

  const next: DecisionRecord = { ...found, picked: option, result };

  return {
    decision: toWireDecision(next),
    records: records.map((record) => {
      if (record.id === decisionId) {
        return next;
      }

      return record;
    }),
  };
};

const toDecisionJson = (records: readonly DecisionRecord[]): string =>
  `${JSON.stringify(records, null, 2)}\n`;

export {
  getDecisionFile,
  toMissingDecision,
  listDecisionRecords,
  toCreatedRecords,
  toDecisionJson,
  toDecisionRunId,
  toPickedRecords,
  toWireDecision,
};

export type {
  DecisionCreateCall,
  DecisionPick,
  DecisionPickCall,
  DecisionRecord,
};
