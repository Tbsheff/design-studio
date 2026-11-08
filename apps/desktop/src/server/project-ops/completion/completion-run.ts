import { Conflict } from "@design-studio/actions/_core/errors/conflict";
import { Effect } from "effect";
import type { Semaphore } from "effect";

import { toRecord } from "./completion-call.js";
import { getSavedCompletion, setSavedCompletion } from "./completion-file.js";
import type { CompletionSettings } from "./completion-file.js";
import { runCompletionAnswer } from "./completion-model.js";
import { toSpentUsd } from "./engine/to-spent-usd.js";

interface CreateCommand {
  readonly frame: string | null;
  readonly maxTokens: number;
  readonly projectId: string;
  readonly prompt: string;
  readonly system: string | null;
}

interface SetCommand extends CompletionSettings {
  readonly projectId: string;
}

interface CompletionResult {
  readonly costUsd: number;
  readonly id: string;
  readonly model: string;
  readonly ms: number;
  readonly text: string;
}

const OFF_MESSAGE =
  "Prototype AI is off for this project. Turn it on in Settings, Keys, Prototype AI.";

const toCapMessage = (capUsd: number): string =>
  `The Prototype AI cap of USD ${capUsd.toFixed(2)} is spent for this month. Raise the cap in Settings, Keys, Prototype AI.`;

const createCompletionResult = Effect.fn("CompletionRun.create")(function* run(
  lock: Semaphore.Semaphore,
  command: CreateCommand
) {
  const saved = yield* getSavedCompletion(command.projectId);

  if (!saved.settings.isEnabled) {
    return yield* new Conflict({ message: OFF_MESSAGE });
  }

  const spentUsd = toSpentUsd(saved.records, Date.now());

  if (spentUsd >= saved.settings.capUsd) {
    return yield* new Conflict({
      message: toCapMessage(saved.settings.capUsd),
    });
  }

  const startedAt = Date.now();

  const answer = yield* runCompletionAnswer({
    budgetUsd: saved.settings.capUsd - spentUsd,
    maxTokens: command.maxTokens,
    prompt: command.prompt,
    system: command.system,
  });

  const ms = Date.now() - startedAt;

  const record = toRecord(
    {
      costUsd: answer.costUsd,
      frame: command.frame,
      model: answer.model,
      ms,
    },
    command.prompt
  );

  yield* lock.withPermits(1)(
    Effect.gen(function* append() {
      const latest = yield* getSavedCompletion(command.projectId);

      yield* setSavedCompletion(command.projectId, {
        ...latest,
        records: [...latest.records, record],
      });
    })
  );

  const result: CompletionResult = {
    costUsd: record.costUsd,
    id: record.id,
    model: record.model,
    ms: record.ms,
    text: answer.text,
  };

  return result;
});

const setCompletionSettings = Effect.fn("CompletionRun.set")(function* run(
  lock: Semaphore.Semaphore,
  command: SetCommand
) {
  const settings: CompletionSettings = {
    capUsd: command.capUsd,
    isEnabled: command.isEnabled,
  };

  yield* lock.withPermits(1)(
    Effect.gen(function* write() {
      const latest = yield* getSavedCompletion(command.projectId);

      yield* setSavedCompletion(command.projectId, { ...latest, settings });
    })
  );

  return settings;
});

export { createCompletionResult, setCompletionSettings };

export type { CompletionResult, CreateCommand, SetCommand };
