import { Context, Effect, Layer } from "effect";

import type { ShareServerState } from "../../shared/actions/share/schema.js";
import { loadConfig } from "../platform/config/index.js";
import { OFF_STATE, toShareRuntime } from "./share-core.js";
import type { ShareRuntime } from "./share-core.js";

interface ShareListenerApi {
  readonly setLan: (isOn: boolean) => Effect.Effect<ShareServerState>;
  readonly state: () => Effect.Effect<ShareServerState>;
  readonly sync: () => Effect.Effect<ShareServerState>;
}

const toRuntime = (): ShareRuntime | null =>
  toShareRuntime(loadConfig().dataDir);

const runShareSync = Effect.fn("ShareListener.sync")(function* run() {
  const runtime = toRuntime();

  if (runtime === null) {
    return OFF_STATE;
  }

  return yield* Effect.promise(() => runtime.server.sync());
});

const setLan = Effect.fn("ShareListener.setLan")(function* run(isOn: boolean) {
  const runtime = toRuntime();

  if (runtime === null) {
    return OFF_STATE;
  }

  return yield* Effect.promise(() => runtime.server.setLan(isOn));
});

const stopServer = Effect.fn("ShareListener.stop")(function* run() {
  const runtime = toRuntime();

  if (runtime === null) {
    return;
  }

  yield* Effect.promise(() => runtime.server.stop());
});

class ShareListener extends Context.Service<ShareListener, ShareListenerApi>()(
  "design-studio/share/ShareListener"
) {
  declare public readonly access: "write";

  public static readonly layer = Layer.effect(
    ShareListener,
    Effect.gen(function* make() {
      yield* Effect.addFinalizer(() =>
        stopServer().pipe(Effect.orElseSucceed(() => null))
      );

      return ShareListener.of({
        setLan,
        state: Effect.fn("ShareListener.state")(function* run() {
          const runtime = toRuntime();

          if (runtime === null) {
            return OFF_STATE;
          }

          return yield* Effect.sync(() => runtime.server.state());
        }),
        sync: runShareSync,
      });
    })
  );
}

export { ShareListener };

export type { ShareListenerApi };
