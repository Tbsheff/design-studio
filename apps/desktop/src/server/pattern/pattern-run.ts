import { rm } from "node:fs/promises";

import { NotFound } from "@design-studio/actions/_core/errors/not-found";
import { Effect } from "effect";

import {
  attemptKnown,
  runDirectionRead,
  runDirectionWrite,
  setPrivateJson,
  toDirectEditStatusFailure,
} from "./deps.js";
import type { DirectionIds, KnownFailure, SourceLoc } from "./deps.js";
import { createStoredPattern } from "./pattern-capture.js";
import type {
  InsertPosition,
  PatternInserted,
  StoredPattern,
} from "./pattern-model.js";
import { toPatternFile } from "./pattern-paths.js";
import { insertStoredPattern } from "./pattern-place.js";
import { getSavedPatternById } from "./pattern-saved.js";

interface CreatePatternCommand extends DirectionIds {
  readonly name: string;
  readonly source: SourceLoc;
  readonly tag: string | null;
  readonly tags: readonly string[];
  readonly thumbnail: string | null;
}

interface InsertPatternCommand extends DirectionIds {
  readonly page: string | null;
  readonly patternId: string;
  readonly position: InsertPosition;
  readonly source: SourceLoc | null;
  readonly tag: string | null;
}

const toMissing = (id: string): NotFound =>
  new NotFound({
    message: `No saved pattern has the id ${id}. Call list_pattern to see the ids.`,
  });

const runPatternCreate = Effect.fn("PatternRun.create")(function* run(
  command: CreatePatternCommand
) {
  const pattern: StoredPattern = yield* runDirectionRead(
    command,
    (scope) =>
      createStoredPattern(
        {
          direction: scope.direction,
          project: scope.project,
          workTree: scope.direction.workTree,
        },
        command
      ),
    toDirectEditStatusFailure
  );

  const known = yield* getSavedPatternById(pattern.id);

  const saved: StoredPattern = {
    ...pattern,
    savedAt: known?.savedAt ?? pattern.savedAt,
  };

  yield* setPrivateJson(toPatternFile(saved.id), saved);

  return saved;
});

const runPatternInsert = Effect.fn("PatternRun.insert")(function* run(
  command: InsertPatternCommand
) {
  const stored = yield* getSavedPatternById(command.patternId);

  if (stored === null) {
    return yield* toMissing(command.patternId);
  }

  const inserted: PatternInserted = yield* runDirectionWrite(
    command,
    (scope) =>
      insertStoredPattern(
        {
          deps: scope.runtime.editDeps,
          direction: scope.direction,
          project: scope.project,
          workTree: scope.direction.workTree,
        },
        stored,
        command
      ),
    toDirectEditStatusFailure
  );

  return inserted;
});

const deletePatternFile = (id: string): Effect.Effect<void, KnownFailure> =>
  attemptKnown(() => rm(toPatternFile(id), { force: true }));

export { deletePatternFile, runPatternCreate, runPatternInsert };

export type { CreatePatternCommand, InsertPatternCommand };
