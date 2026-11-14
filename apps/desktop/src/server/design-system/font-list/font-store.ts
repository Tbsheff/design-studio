import { Context, Effect, Layer } from "effect";

import { createBoundedCache } from "./deps.js";
import type { KnownFailure } from "./deps.js";
import { runFontList } from "./font-list-run.js";
import type { FontCache, FontPage, ListFontCommand } from "./font-list-run.js";

interface FontStoreApi {
  readonly list: (
    command: ListFontCommand
  ) => Effect.Effect<FontPage, KnownFailure>;
}

const MAX_CACHED_ROOTS = 32;

class FontStore extends Context.Service<FontStore, FontStoreApi>()(
  "design-studio/design-system/FontStore"
) {
  declare public readonly access: "read";

  public static readonly layer = Layer.sync(FontStore, () => {
    const cache: FontCache = createBoundedCache(MAX_CACHED_ROOTS);

    return FontStore.of({
      list: Effect.fn("FontStore.list")(function* run(
        command: ListFontCommand
      ) {
        return yield* runFontList(cache, command);
      }),
    });
  });
}

export { FontStore };

export type { FontStoreApi };
