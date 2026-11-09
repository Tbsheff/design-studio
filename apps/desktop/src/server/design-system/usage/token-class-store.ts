import { Context, Effect, Layer } from "effect";

import { createBoundedCache } from "./deps.js";
import type { KnownFailure } from "./deps.js";
import { runTokenClassList } from "./token-class-run.js";
import type {
  ListTokenClassesCommand,
  TokenClassPage,
} from "./token-class-run.js";
import type { ScanCache } from "./token-usage-files.js";

interface TokenClassStoreApi {
  readonly list: (
    command: ListTokenClassesCommand
  ) => Effect.Effect<TokenClassPage, KnownFailure>;
}

const MAX_SCANNED_FILES = 60_000;

class TokenClassStore extends Context.Service<
  TokenClassStore,
  TokenClassStoreApi
>()("design-studio/design-system/TokenClassStore") {
  declare public readonly access: "read";

  public static readonly layer = Layer.sync(TokenClassStore, () => {
    const cache: ScanCache = createBoundedCache(MAX_SCANNED_FILES);

    return TokenClassStore.of({
      list: Effect.fn("TokenClassStore.list")(function* run(
        command: ListTokenClassesCommand
      ) {
        return yield* runTokenClassList(cache, command);
      }),
    });
  });
}

export { TokenClassStore };

export type { TokenClassStoreApi };
