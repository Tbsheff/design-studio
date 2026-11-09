import { Context, Effect, Layer } from "effect";

import type { KnownFailure } from "../../platform/attempt/index.js";
import { runSpellingSet } from "./spelling-run.js";

interface SpellingWordWriterApi {
  readonly set: (
    projectId: string,
    words: readonly string[]
  ) => Effect.Effect<readonly string[], KnownFailure>;
}

class SpellingWordWriter extends Context.Service<
  SpellingWordWriter,
  SpellingWordWriterApi
>()("design-studio/review/SpellingWordWriter") {
  declare public readonly access: "write";

  public static readonly layer = Layer.succeed(
    SpellingWordWriter,
    SpellingWordWriter.of({
      set: Effect.fn("SpellingWordWriter.set")(function* run(
        projectId: string,
        words: readonly string[]
      ) {
        return yield* runSpellingSet(projectId, words);
      }),
    })
  );
}

export { SpellingWordWriter };

export type { SpellingWordWriterApi };
