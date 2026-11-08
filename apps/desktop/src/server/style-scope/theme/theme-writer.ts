import { Context, Effect, Layer } from "effect";

import type { KnownFailure } from "./deps.js";
import type {
  ThemeApplied,
  ThemeCreated,
  ThemeSetResult,
} from "./theme-model.js";
import { runThemeApply, runThemeCreate, runThemeSet } from "./theme-run.js";
import type {
  ApplyThemeCommand,
  CreateThemeCommand,
  SetThemeCommand,
} from "./theme-run.js";

interface ThemeWriterApi {
  readonly apply: (
    command: ApplyThemeCommand
  ) => Effect.Effect<ThemeApplied, KnownFailure>;
  readonly create: (
    command: CreateThemeCommand
  ) => Effect.Effect<ThemeCreated, KnownFailure>;
  readonly set: (
    command: SetThemeCommand
  ) => Effect.Effect<ThemeSetResult, KnownFailure>;
}

class ThemeWriter extends Context.Service<ThemeWriter, ThemeWriterApi>()(
  "design-studio/style-scope/ThemeWriter"
) {
  declare public readonly access: "write";

  public static readonly layer = Layer.succeed(
    ThemeWriter,
    ThemeWriter.of({
      apply: Effect.fn("ThemeWriter.apply")(function* run(
        command: ApplyThemeCommand
      ) {
        return yield* runThemeApply(command);
      }),
      create: Effect.fn("ThemeWriter.create")(function* run(
        command: CreateThemeCommand
      ) {
        return yield* runThemeCreate(command);
      }),
      set: Effect.fn("ThemeWriter.set")(function* run(
        command: SetThemeCommand
      ) {
        return yield* runThemeSet(command);
      }),
    })
  );
}

export { ThemeWriter };

export type { ThemeWriterApi };
