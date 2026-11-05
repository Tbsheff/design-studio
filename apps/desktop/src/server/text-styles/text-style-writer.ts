import { Context, Effect, Layer } from "effect";

import type { KnownFailure } from "../platform/attempt/index.js";
import {
  runTextStyleApply,
  runTextStyleCreate,
  runTextStyleDetach,
} from "./text-style-run.js";
import type {
  ApplyTextStyleCommand,
  CreateTextStyleCommand,
  DetachTextStyleCommand,
  TextStyleApplied,
  TextStyleCreated,
  TextStyleDetached,
} from "./text-style-run.js";

interface TextStyleWriterApi {
  readonly apply: (
    command: ApplyTextStyleCommand
  ) => Effect.Effect<TextStyleApplied, KnownFailure>;
  readonly create: (
    command: CreateTextStyleCommand
  ) => Effect.Effect<TextStyleCreated, KnownFailure>;
  readonly detach: (
    command: DetachTextStyleCommand
  ) => Effect.Effect<TextStyleDetached, KnownFailure>;
}

class TextStyleWriter extends Context.Service<
  TextStyleWriter,
  TextStyleWriterApi
>()("design-studio/text-styles/TextStyleWriter") {
  declare public readonly access: "write";

  public static readonly layer = Layer.succeed(
    TextStyleWriter,
    TextStyleWriter.of({
      apply: Effect.fn("TextStyleWriter.apply")(function* run(
        command: ApplyTextStyleCommand
      ) {
        return yield* runTextStyleApply(command);
      }),
      create: Effect.fn("TextStyleWriter.create")(function* run(
        command: CreateTextStyleCommand
      ) {
        return yield* runTextStyleCreate(command);
      }),
      detach: Effect.fn("TextStyleWriter.detach")(function* run(
        command: DetachTextStyleCommand
      ) {
        return yield* runTextStyleDetach(command);
      }),
    })
  );
}

export { TextStyleWriter };

export type { TextStyleWriterApi };
