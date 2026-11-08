import { Context, Effect, Layer } from "effect";

import type { KnownFailure } from "../../platform/attempt/index.js";
import type {
  EffectChange,
  EffectStyleDeleted,
  EffectStyleSaved,
} from "./deps.js";
import {
  runEffectCreate,
  runEffectDelete,
  runEffectSet,
} from "./effect-run.js";
import type {
  CreateEffectCommand,
  DeleteEffectCommand,
  SetEffectCommand,
} from "./effect-run.js";

interface EffectWriterApi {
  readonly create: (
    command: CreateEffectCommand
  ) => Effect.Effect<EffectStyleSaved, KnownFailure>;
  readonly delete: (
    command: DeleteEffectCommand
  ) => Effect.Effect<EffectStyleDeleted, KnownFailure>;
  readonly set: (
    command: SetEffectCommand
  ) => Effect.Effect<EffectChange, KnownFailure>;
}

class EffectWriter extends Context.Service<EffectWriter, EffectWriterApi>()(
  "design-studio/style-scope/EffectWriter"
) {
  declare public readonly access: "write";

  public static readonly layer = Layer.succeed(
    EffectWriter,
    EffectWriter.of({
      create: Effect.fn("EffectWriter.create")(function* run(
        command: CreateEffectCommand
      ) {
        return yield* runEffectCreate(command);
      }),
      delete: Effect.fn("EffectWriter.delete")(function* run(
        command: DeleteEffectCommand
      ) {
        return yield* runEffectDelete(command);
      }),
      set: Effect.fn("EffectWriter.set")(function* run(
        command: SetEffectCommand
      ) {
        return yield* runEffectSet(command);
      }),
    })
  );
}

export { EffectWriter };

export type { EffectWriterApi };
