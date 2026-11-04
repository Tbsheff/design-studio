import type { Unavailable } from "@design-studio/actions/_core/errors/unavailable";
import { Context, Effect, Layer } from "effect";

import type { AnimationExport } from "./animation-export.js";
import type { CreateCommand, UpdateCommand } from "./animation-plan.js";
import type { RefCommand } from "./animation-scope.js";
import {
  runCreate,
  runDelete,
  runExport,
  runUpdate,
} from "./animation-write.js";
import type {
  AnimationChange,
  AnimationRemoved,
  ExportCommand,
} from "./animation-write.js";
import type { KnownFailure } from "./deps.js";

interface AnimationWriterApi {
  readonly create: (
    command: CreateCommand
  ) => Effect.Effect<AnimationChange, KnownFailure>;
  readonly delete: (
    command: RefCommand
  ) => Effect.Effect<AnimationRemoved, KnownFailure>;
  readonly export: (
    command: ExportCommand
  ) => Effect.Effect<AnimationExport, KnownFailure | Unavailable>;
  readonly update: (
    command: UpdateCommand
  ) => Effect.Effect<AnimationChange, KnownFailure>;
}

class AnimationWriter extends Context.Service<
  AnimationWriter,
  AnimationWriterApi
>()("design-studio/state-styles/AnimationWriter") {
  declare public readonly access: "write";

  public static readonly layer = Layer.succeed(
    AnimationWriter,
    AnimationWriter.of({
      create: Effect.fn("AnimationWriter.create")(function* run(
        command: CreateCommand
      ) {
        return yield* runCreate(command);
      }),
      delete: Effect.fn("AnimationWriter.delete")(function* run(
        command: RefCommand
      ) {
        return yield* runDelete(command);
      }),
      export: Effect.fn("AnimationWriter.export")(function* run(
        command: ExportCommand
      ) {
        return yield* runExport(command);
      }),
      update: Effect.fn("AnimationWriter.update")(function* run(
        command: UpdateCommand
      ) {
        return yield* runUpdate(command);
      }),
    })
  );
}

export { AnimationWriter };

export type { AnimationWriterApi };
