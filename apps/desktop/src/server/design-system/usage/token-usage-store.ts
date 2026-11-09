import { Context, Effect, Layer } from "effect";

import { createBoundedCache } from "./deps.js";
import type { KnownFailure } from "./deps.js";
import type { ScanCache } from "./token-usage-files.js";
import { runTokenUsageList } from "./token-usage-run.js";
import type {
  ListTokenUsageCommand,
  TokenUsagePage,
} from "./token-usage-run.js";

interface TokenUsageStoreApi {
  readonly list: (
    command: ListTokenUsageCommand
  ) => Effect.Effect<TokenUsagePage, KnownFailure>;
}

const MAX_SCANNED_FILES = 8000;

class TokenUsageStore extends Context.Service<
  TokenUsageStore,
  TokenUsageStoreApi
>()("design-studio/design-system/TokenUsageStore") {
  declare public readonly access: "read";

  public static readonly layer = Layer.sync(TokenUsageStore, () => {
    const cache: ScanCache = createBoundedCache(MAX_SCANNED_FILES);

    return TokenUsageStore.of({
      list: Effect.fn("TokenUsageStore.list")(function* run(
        command: ListTokenUsageCommand
      ) {
        return yield* runTokenUsageList(cache, command);
      }),
    });
  });
}

export { TokenUsageStore };

export type { TokenUsageStoreApi };
