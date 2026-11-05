import { Context, Effect, Layer } from "effect";

import type { KnownFailure } from "../platform/attempt/index.js";
import { runAccessibilityInspect } from "./accessibility-run.js";
import type { InspectAccessibilityCommand } from "./accessibility-run.js";
import type { AccessibilityReport } from "./deps.js";

interface AccessibilityStoreApi {
  readonly inspect: (
    command: InspectAccessibilityCommand
  ) => Effect.Effect<AccessibilityReport, KnownFailure>;
}

class AccessibilityStore extends Context.Service<
  AccessibilityStore,
  AccessibilityStoreApi
>()("design-studio/accessibility/AccessibilityStore") {
  declare public readonly access: "read";

  public static readonly layer = Layer.succeed(
    AccessibilityStore,
    AccessibilityStore.of({
      inspect: Effect.fn("AccessibilityStore.inspect")(function* run(
        command: InspectAccessibilityCommand
      ) {
        return yield* runAccessibilityInspect(command);
      }),
    })
  );
}

export { AccessibilityStore };

export type { AccessibilityStoreApi };
