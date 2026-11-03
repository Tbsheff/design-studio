import { Context, Effect, Layer, Schema } from "effect";

import type { Unauthenticated } from "../../shared/actions/_core/errors/unauthenticated.js";
import { Unavailable } from "../../shared/actions/_core/errors/unavailable.js";
import {
  CloudOrgSchema,
  CloudUserSchema,
} from "../../shared/actions/cloud/schema.js";
import { CloudSession } from "./session.js";
import type { CloudProfile } from "./session.js";

const CLOUD_ORIGIN = "https://api.designstudio.app";

const OrgListSchema = Schema.Array(CloudOrgSchema);

interface CloudClientApi {
  readonly profile: () => Effect.Effect<
    CloudProfile,
    Unauthenticated | Unavailable,
    CloudSession
  >;
}

const unavailable = (): Unavailable =>
  new Unavailable({ message: "The cloud did not answer." });

const readJson = <Value>(
  path: string,
  jwt: string,
  schema: Schema.Codec<Value, unknown>
): Effect.Effect<Value, Unavailable> =>
  Effect.gen(function* read() {
    const response = yield* Effect.tryPromise({
      catch: unavailable,
      try: (signal) =>
        fetch(new URL(path, CLOUD_ORIGIN), {
          headers: { authorization: `Bearer ${jwt}` },
          redirect: "error",
          signal,
        }),
    });

    if (!response.ok) {
      return yield* unavailable();
    }

    const body = yield* Effect.tryPromise({
      catch: unavailable,
      try: () => response.json(),
    });

    return yield* Schema.decodeUnknownEffect(schema)(body).pipe(
      Effect.mapError(unavailable)
    );
  });

class CloudClient extends Context.Service<CloudClient, CloudClientApi>()(
  "design-studio/cloud/CloudClient"
) {
  declare public readonly access: "read";

  public static readonly layer = Layer.succeed(
    CloudClient,
    CloudClient.of({
      profile: Effect.fn("CloudClient.profile")(function* run() {
        const session = yield* CloudSession;

        return yield* session.withToken((jwt) =>
          Effect.all({
            orgs: readJson("/v1/orgs", jwt, OrgListSchema),
            user: readJson("/v1/me", jwt, CloudUserSchema),
          })
        );
      }),
    })
  );
}

export { CLOUD_ORIGIN, CloudClient };

export type { CloudClientApi };
