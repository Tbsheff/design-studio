import { NotFound } from "@design-studio/actions/_core/errors/not-found";
import { Context, Effect, Layer } from "effect";

import type { KnownFailure } from "./deps.js";
import type { PatternInserted, StoredPattern } from "./pattern-model.js";
import {
  deletePatternFile,
  runPatternCreate,
  runPatternInsert,
} from "./pattern-run.js";
import type {
  CreatePatternCommand,
  InsertPatternCommand,
} from "./pattern-run.js";
import { getSavedPatternById } from "./pattern-saved.js";

interface PatternDeleted {
  readonly id: string;
  readonly name: string;
}

interface PatternWriterApi {
  readonly create: (
    command: CreatePatternCommand
  ) => Effect.Effect<StoredPattern, KnownFailure>;
  readonly delete: (id: string) => Effect.Effect<PatternDeleted, KnownFailure>;
  readonly insert: (
    command: InsertPatternCommand
  ) => Effect.Effect<PatternInserted, KnownFailure>;
}

class PatternWriter extends Context.Service<PatternWriter, PatternWriterApi>()(
  "design-studio/share/PatternWriter"
) {
  declare public readonly access: "write";

  public static readonly layer = Layer.succeed(
    PatternWriter,
    PatternWriter.of({
      create: Effect.fn("PatternWriter.create")(function* run(
        command: CreatePatternCommand
      ) {
        return yield* runPatternCreate(command);
      }),
      delete: Effect.fn("PatternWriter.delete")(function* run(id: string) {
        const stored = yield* getSavedPatternById(id);

        if (stored === null) {
          return yield* new NotFound({
            message: `No saved pattern has the id ${id}. Call list_pattern to see the ids.`,
          });
        }

        yield* deletePatternFile(id);

        return { id: stored.id, name: stored.name };
      }),
      insert: Effect.fn("PatternWriter.insert")(function* run(
        command: InsertPatternCommand
      ) {
        return yield* runPatternInsert(command);
      }),
    })
  );
}

export { PatternWriter };

export type { PatternDeleted, PatternWriterApi };
