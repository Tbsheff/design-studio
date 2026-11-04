import { Context, Effect, Layer } from "effect";

import type { KnownFailure } from "./deps.js";
import type { PropChange } from "./prop-model.js";
import type {
  CreateCommand,
  DeleteCommand,
  RenameCommand,
} from "./prop-plan.js";
import { runCreate, runDelete, runRename } from "./prop-write.js";

interface PropWriterApi {
  readonly create: (
    command: CreateCommand
  ) => Effect.Effect<PropChange, KnownFailure>;
  readonly delete: (
    command: DeleteCommand
  ) => Effect.Effect<PropChange, KnownFailure>;
  readonly rename: (
    command: RenameCommand
  ) => Effect.Effect<PropChange, KnownFailure>;
}

class PropWriter extends Context.Service<PropWriter, PropWriterApi>()(
  "design-studio/components/PropWriter"
) {
  declare public readonly access: "write";

  public static readonly layer = Layer.succeed(
    PropWriter,
    PropWriter.of({
      create: Effect.fn("PropWriter.create")(function* run(
        command: CreateCommand
      ) {
        return yield* runCreate(command);
      }),
      delete: Effect.fn("PropWriter.delete")(function* run(
        command: DeleteCommand
      ) {
        return yield* runDelete(command);
      }),
      rename: Effect.fn("PropWriter.rename")(function* run(
        command: RenameCommand
      ) {
        return yield* runRename(command);
      }),
    })
  );
}

export { PropWriter };

export type { PropWriterApi };
