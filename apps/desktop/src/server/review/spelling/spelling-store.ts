import { Context, Effect, Layer } from "effect";

import type { KnownFailure } from "../../platform/attempt/index.js";
import { createCheckerLoader } from "./spelling-checker.js";
import { runSpellingInspect } from "./spelling-run.js";
import type { InspectSpellingCommand, SpellingReport } from "./spelling-run.js";

interface SpellingStoreApi {
  readonly inspect: (
    command: InspectSpellingCommand
  ) => Effect.Effect<SpellingReport, KnownFailure>;
}

class SpellingStore extends Context.Service<SpellingStore, SpellingStoreApi>()(
  "design-studio/review/SpellingStore"
) {
  declare public readonly access: "read";

  public static readonly layer = Layer.sync(SpellingStore, () => {
    const loadChecker = createCheckerLoader();

    return SpellingStore.of({
      inspect: Effect.fn("SpellingStore.inspect")(function* run(
        command: InspectSpellingCommand
      ) {
        return yield* runSpellingInspect(command, loadChecker);
      }),
    });
  });
}

export { SpellingStore };

export type { SpellingStoreApi };
