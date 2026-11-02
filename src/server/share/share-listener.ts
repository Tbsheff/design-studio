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

const syncNow = async (): Promise<ShareServerState> => {
  const runtime = toRuntime();

  if (runtime === null) {
    return OFF_STATE;
  }

  return await runtime.server.sync();
};

const setLanNow = async (isOn: boolean): Promise<ShareServerState> => {
  const runtime = toRuntime();

  if (runtime === null) {
    return OFF_STATE;
  }

  return await runtime.server.setLan(isOn);
};

const stopNow = async (): Promise<void> => {
  const runtime = toRuntime();

  if (runtime === null) {
    return;
  }

  await runtime.server.stop();
};

class ShareListener extends Context.Service<ShareListener, ShareListenerApi>()(
  "design-studio/share/ShareListener"
) {
  declare public readonly access: "write";

  public static readonly layer = Layer.effect(
    ShareListener,
    Effect.gen(function* make() {
      yield* Effect.addFinalizer(() =>
        Effect.promise(() => stopNow()).pipe(Effect.orElseSucceed(() => null))
      );

      return ShareListener.of({
        setLan: Effect.fn("ShareListener.setLan")(function* run(isOn: boolean) {
          return yield* Effect.promise(() => setLanNow(isOn));
        }),
        state: Effect.fn("ShareListener.state")(function* run() {
          const runtime = toRuntime();

          if (runtime === null) {
            return OFF_STATE;
          }

          return yield* Effect.sync(() => runtime.server.state());
        }),
        sync: Effect.fn("ShareListener.sync")(function* run() {
          return yield* Effect.promise(() => syncNow());
        }),
      });
    })
  );
}

export { ShareListener };

export type { ShareListenerApi };
