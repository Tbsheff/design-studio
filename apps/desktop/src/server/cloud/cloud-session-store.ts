import { Context, Effect, Layer } from "effect";

import type { CloudView } from "../../shared/actions/cloud/schema.js";
import { CloudSession } from "./cloud-session.js";

interface CloudSessionStoreApi {
  readonly current: () => Effect.Effect<CloudView>;
}

class CloudSessionStore extends Context.Service<
  CloudSessionStore,
  CloudSessionStoreApi
>()("design-studio/cloud/CloudSessionStore") {
  declare public readonly access: "read";

  public static readonly layer = Layer.effect(
    CloudSessionStore,
    Effect.gen(function* build() {
      const session = yield* CloudSession;

      return CloudSessionStore.of({
        current: Effect.fn("CloudSessionStore.current")(function* run() {
          return yield* session.current();
        }),
      });
    })
  );
}

export { CloudSessionStore };

export type { CloudSessionStoreApi };
