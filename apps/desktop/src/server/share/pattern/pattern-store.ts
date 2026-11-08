import { NotFound } from "@design-studio/actions/_core/errors/not-found";
import { Context, Effect, Layer } from "effect";

import { toPatternPage } from "./pattern-find.js";
import type { ListCommand, PatternPage } from "./pattern-find.js";
import type { StoredPattern } from "./pattern-model.js";
import { getSavedPatternById, listSavedPatterns } from "./pattern-saved.js";

interface PatternStoreApi {
  readonly get: (id: string) => Effect.Effect<StoredPattern, NotFound>;
  readonly list: (command: ListCommand) => Effect.Effect<PatternPage>;
}

class PatternStore extends Context.Service<PatternStore, PatternStoreApi>()(
  "design-studio/share/PatternStore"
) {
  declare public readonly access: "read";

  public static readonly layer = Layer.succeed(
    PatternStore,
    PatternStore.of({
      get: Effect.fn("PatternStore.get")(function* run(id: string) {
        const found = yield* getSavedPatternById(id);

        if (found === null) {
          return yield* new NotFound({
            message: `No saved pattern has the id ${id}. Call list_pattern to see the ids.`,
          });
        }

        return found;
      }),
      list: Effect.fn("PatternStore.list")(function* run(command: ListCommand) {
        return toPatternPage(yield* listSavedPatterns(), command);
      }),
    })
  );
}

export { PatternStore };

export type { PatternStoreApi };
