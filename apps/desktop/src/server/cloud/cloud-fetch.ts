import { env } from "node:process";

import { Unavailable } from "@design-studio/actions/_core/errors/unavailable";
import { Effect, Result } from "effect";
import type { Schema } from "effect";

import { toDecoder } from "../platform/decode/index.js";

const UNSET_ORIGIN = "https://cloud-origin-unset.invalid";

const toCloudOrigin = (): string =>
  [env.STUDIO_API_ORIGIN, env.STUDIO_WEB_ORIGIN].find(
    (value) => (value ?? "").trim() !== ""
  ) ?? UNSET_ORIGIN;

const CLOUD_ORIGIN = toCloudOrigin();

const toUnavailable = (): Unavailable =>
  new Unavailable({
    message:
      "The Design Studio cloud did not answer. Check your connection, then try again.",
  });

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

    const decoded = toDecoder(schema, "ignore")(body);

    if (Result.isFailure(decoded)) {
      return yield* toUnavailable();
    }

    return decoded.success;
  });

export { CLOUD_ORIGIN, getJsonResponse, toUnavailable };

export type { JsonCall };
