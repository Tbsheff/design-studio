import type { Unavailable } from "@design-studio/actions/_core/errors/unavailable";
import { Context, Effect, Layer } from "effect";

import type { KnownFailure } from "./deps.js";
import { runThemeImport } from "./theme-import-run.js";
import type { ImportThemeCommand } from "./theme-import-run.js";
import type {
  ThemeApplied,
  ThemeCreated,
  ThemeImported,
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
  readonly import: (
    command: ImportThemeCommand
  ) => Effect.Effect<ThemeImported, KnownFailure | Unavailable>;
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
      import: Effect.fn("ThemeWriter.import")(function* run(
        command: ImportThemeCommand
      ) {
        return yield* runThemeImport(command);
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
