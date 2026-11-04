import { Effect, Schema } from "effect";

import { Unavailable } from "@design-studio/actions/_core/errors/unavailable";

const CLOUD_ORIGIN = "https://api.designstudio.app";

const toUnavailable = (): Unavailable =>
  new Unavailable({ message: "The cloud did not answer." });

interface JsonCall {
  readonly body: string | null;
  readonly headers: Readonly<Record<string, string>>;
  readonly jwt: string;
  readonly method: "DELETE" | "GET" | "POST";
  readonly path: string;
}

const getJsonResponse = <Value>(
  call: JsonCall,
  schema: Schema.Codec<Value, unknown>
): Effect.Effect<Value, Unavailable> =>
  Effect.gen(function* read() {
    const response = yield* Effect.tryPromise({
      catch: toUnavailable,
      try: (signal) =>
        fetch(new URL(call.path, CLOUD_ORIGIN), {
          body: call.body,
          headers: {
            ...call.headers,
            authorization: `Bearer ${call.jwt}`,
          },
          method: call.method,
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

export { CLOUD_ORIGIN, getJsonResponse, toUnavailable };

export type { JsonCall };
