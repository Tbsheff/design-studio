import { Context, Effect, Layer } from "effect";

import type {
  CreateScreenCommand,
  DuplicateScreenCommand,
  ScreenCreated,
  ScreenDuplicated,
} from "../../app/index.js";
import type { KnownFailure } from "../../platform/attempt/index.js";
import { runScreenCreate, runScreenDuplicate } from "./screen-run.js";

interface ScreenWriterApi {
  readonly create: (
    command: CreateScreenCommand
  ) => Effect.Effect<ScreenCreated, KnownFailure>;
  readonly duplicate: (
    command: DuplicateScreenCommand
  ) => Effect.Effect<ScreenDuplicated, KnownFailure>;
}

class ScreenWriter extends Context.Service<ScreenWriter, ScreenWriterApi>()(
  "design-studio/export/ScreenWriter"
) {
  declare public readonly access: "write";

  public static readonly layer = Layer.succeed(
    ScreenWriter,
    ScreenWriter.of({
      create: Effect.fn("ScreenWriter.create")(function* run(
        command: CreateScreenCommand
      ) {
        return yield* runScreenCreate(command);
      }),
      duplicate: Effect.fn("ScreenWriter.duplicate")(function* run(
        command: DuplicateScreenCommand
      ) {
        return yield* runScreenDuplicate(command);
      }),
    })
  );
}

export { ScreenWriter };

export type { ScreenWriterApi };
