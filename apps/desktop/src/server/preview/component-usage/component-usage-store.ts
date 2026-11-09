import { Context, Effect, Layer } from "effect";

import { runComponentUsageList } from "./component-usage-run.js";
import type {
  ComponentUsagePage,
  ListComponentUsageCommand,
  UsageCache,
} from "./component-usage-run.js";
import { createBoundedCache } from "./deps.js";
import type { KnownFailure } from "./deps.js";

interface ComponentUsageStoreApi {
  readonly list: (
    command: ListComponentUsageCommand
  ) => Effect.Effect<ComponentUsagePage, KnownFailure>;
}

const MAX_CACHED_SCANS = 16;

class ComponentUsageStore extends Context.Service<
  ComponentUsageStore,
  ComponentUsageStoreApi
>()("design-studio/preview/ComponentUsageStore") {
  declare public readonly access: "read";

  public static readonly layer = Layer.sync(ComponentUsageStore, () => {
    const cache: UsageCache = createBoundedCache(MAX_CACHED_SCANS);

    return ComponentUsageStore.of({
      list: Effect.fn("ComponentUsageStore.list")(function* run(
        command: ListComponentUsageCommand
      ) {
        return yield* runComponentUsageList(cache, command);
      }),
    });
  });
}

export { ComponentUsageStore };

export type { ComponentUsageStoreApi };
