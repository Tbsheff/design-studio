import { Context, Effect, Layer } from "effect";

import type { CloudView } from "../../shared/actions/cloud/schema.js";
import { CloudClient } from "./cloud-client.js";
import { CloudSession } from "./cloud-session.js";
import type { CloudToken } from "./cloud-session.js";

interface CloudSessionWriterApi {
  readonly store: (
    token: CloudToken
  ) => Effect.Effect<CloudView, never, CloudClient | CloudSession>;
}

class CloudSessionWriter extends Context.Service<
  CloudSessionWriter,
  CloudSessionWriterApi
>()("design-studio/cloud/CloudSessionWriter") {
  declare public readonly access: "write";

  public static readonly layer = Layer.succeed(
    CloudSessionWriter,
    CloudSessionWriter.of({
      store: Effect.fn("CloudSessionWriter.store")(function* run(
        token: CloudToken
      ) {
        const session = yield* CloudSession;
        const client = yield* CloudClient;

        yield* session.set(token);

        const profile = yield* client
          .profile()
          .pipe(Effect.orElseSucceed(() => null));

        if (profile !== null) {
          yield* session.remember(profile);
        }

        return yield* session.current();
      }),
    })
  );
}

export { CloudSessionWriter };
