import { Context, Effect, Layer } from "effect";

import { CloudBindings } from "./bindings.js";
import type { LockoutVerdict, UnlockLockout } from "./unlock-lockout.js";

interface UnlockLockoutClientApi {
  readonly check: (key: string) => Effect.Effect<LockoutVerdict>;
  readonly clear: (key: string) => Effect.Effect<void>;
  readonly fail: (key: string) => Effect.Effect<LockoutVerdict>;
}

class UnlockLockoutClient extends Context.Service<
  UnlockLockoutClient,
  UnlockLockoutClientApi
>()("design-studio/platform/UnlockLockoutClient") {
  declare public readonly access: "write";

  public static readonly layer = Layer.effect(
    UnlockLockoutClient,
    Effect.gen(function* make() {
      const { unlock } = yield* CloudBindings;

      const stubOf = (key: string): DurableObjectStub<UnlockLockout> =>
        unlock.get(unlock.idFromName(key));

      return UnlockLockoutClient.of({
        check: Effect.fn("UnlockLockoutClient.check")(function* run(
          key: string
        ) {
          return yield* Effect.promise(() => stubOf(key).check());
        }),
        clear: Effect.fn("UnlockLockoutClient.clear")(function* run(
          key: string
        ) {
          yield* Effect.promise(() => stubOf(key).clear());
        }),
        fail: Effect.fn("UnlockLockoutClient.fail")(function* run(key: string) {
          return yield* Effect.promise(() => stubOf(key).fail());
        }),
      });
    })
  );
}

export { UnlockLockoutClient };

export type { UnlockLockoutClientApi };
