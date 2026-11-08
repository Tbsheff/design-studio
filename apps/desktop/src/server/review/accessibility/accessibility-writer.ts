import { Context, Effect, Layer } from "effect";

import type { KnownFailure } from "../../platform/attempt/index.js";
import { runAccessibilitySet } from "./accessibility-run.js";
import type { SetAccessibilityCommand } from "./accessibility-run.js";
import type { AccessibilitySetResult } from "./deps.js";

interface AccessibilityWriterApi {
  readonly set: (
    command: SetAccessibilityCommand
  ) => Effect.Effect<AccessibilitySetResult, KnownFailure>;
}

class AccessibilityWriter extends Context.Service<
  AccessibilityWriter,
  AccessibilityWriterApi
>()("design-studio/review/AccessibilityWriter") {
  declare public readonly access: "write";

  public static readonly layer = Layer.succeed(
    AccessibilityWriter,
    AccessibilityWriter.of({
      set: Effect.fn("AccessibilityWriter.set")(function* run(
        command: SetAccessibilityCommand
      ) {
        return yield* runAccessibilitySet(command);
      }),
    })
  );
}

export { AccessibilityWriter };

export type { AccessibilityWriterApi };
