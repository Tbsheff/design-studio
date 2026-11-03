import { Context, Effect, Layer, Schema } from "effect";

import type { Unauthenticated } from "../../shared/actions/_core/errors/unauthenticated.js";
import { Unavailable } from "../../shared/actions/_core/errors/unavailable.js";
import {
  CloudOrgSchema,
  CloudUserSchema,
} from "../../shared/actions/cloud/schema.js";
import { CloudSession } from "./cloud-session.js";
import type { CloudProfile } from "./cloud-session.js";

const CLOUD_ORIGIN = "https://api.designstudio.app";

const OrgListSchema = Schema.Array(CloudOrgSchema);

interface CloudClientApi {
  readonly profile: () => Effect.Effect<
    CloudProfile,
    Unauthenticated | Unavailable,
    CloudSession
  >;
}

const toUnavailable = (): Unavailable =>
  new Unavailable({ message: "The cloud did not answer." });

const getJson = <Value>(
  path: string,
  jwt: string,
  schema: Schema.Codec<Value, unknown>
): Effect.Effect<Value, Unavailable> =>
  Effect.gen(function* read() {
    const response = yield* Effect.tryPromise({
      catch: toUnavailable,
      try: (signal) =>
        fetch(new URL(path, CLOUD_ORIGIN), {
          headers: { authorization: `Bearer ${jwt}` },
          redirect: "error",
          signal,
        }),
    });

    if (!response.ok) {
      return yield* toUnavailable();
    }

    const body = yield* Effect.tryPromise({
      catch: toUnavailable,
      try: () => response.json(),
    });

    return yield* Schema.decodeUnknownEffect(schema)(body).pipe(
      Effect.mapError(toUnavailable)
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
            orgs: getJson("/v1/orgs", jwt, OrgListSchema),
            user: getJson("/v1/me", jwt, CloudUserSchema),
          })
        );
      }),
    })
  );
}

export { CloudClient };

export type { CloudClientApi };
