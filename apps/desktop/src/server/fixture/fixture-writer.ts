import { Context, Effect, Layer } from "effect";

import type { KnownFailure } from "../platform/attempt/index.js";
import type {
  CreateFixtureCommand,
  DeleteFixtureCommand,
  FixtureCreated,
  FixtureDeleted,
} from "./fixture-model.js";
import { runFixtureCreate, runFixtureDelete } from "./fixture-run.js";

interface FixtureWriterApi {
  readonly create: (
    command: CreateFixtureCommand
  ) => Effect.Effect<FixtureCreated, KnownFailure>;
  readonly delete: (
    command: DeleteFixtureCommand
  ) => Effect.Effect<FixtureDeleted, KnownFailure>;
}

class FixtureWriter extends Context.Service<FixtureWriter, FixtureWriterApi>()(
  "design-studio/fixture/FixtureWriter"
) {
  declare public readonly access: "write";

  public static readonly layer = Layer.succeed(
    FixtureWriter,
    FixtureWriter.of({
      create: Effect.fn("FixtureWriter.create")(function* run(
        command: CreateFixtureCommand
      ) {
        return yield* runFixtureCreate(command);
      }),
      delete: Effect.fn("FixtureWriter.delete")(function* run(
        command: DeleteFixtureCommand
      ) {
        return yield* runFixtureDelete(command);
      }),
    })
  );
}

export { FixtureWriter };

export type { FixtureWriterApi };
