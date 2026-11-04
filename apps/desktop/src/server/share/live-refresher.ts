import { Context, Effect, Layer } from "effect";

import { loadConfig } from "../platform/config/index.js";
import { toShareRuntime } from "./share-core.js";
import type { ShareRuntime } from "./share-core.js";

interface LiveRefresherApi {
  readonly kick: () => Effect.Effect<void>;
}

const toRuntime = (): ShareRuntime | null =>
  toShareRuntime(loadConfig().dataDir);

class LiveRefresher extends Context.Service<LiveRefresher, LiveRefresherApi>()(
  "design-studio/share/LiveRefresher"
) {
  declare public readonly access: "write";

  public static readonly layer = Layer.effect(
    LiveRefresher,
    Effect.gen(function* make() {
      yield* Effect.addFinalizer(() =>
        Effect.sync(() => {
          toRuntime()?.refresher.stop();
        })
      );

      return LiveRefresher.of({
        kick: Effect.fn("LiveRefresher.kick")(function* run() {
          yield* Effect.sync(() => {
            toRuntime()?.refresher.kick();
          });
        }),
      });
    })
  );
}

export { LiveRefresher };

export type { LiveRefresherApi };
