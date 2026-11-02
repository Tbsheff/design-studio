import { Effect } from "effect";
import type { Cause } from "effect";

import { BadRequest } from "../../shared/actions/_core/errors/bad-request.js";
import { NotFound } from "../../shared/actions/_core/errors/not-found.js";
import { loadConfig } from "../platform/config/index.js";
import { NotFoundError } from "../store/errors.js";
import { toShareParts } from "./share-core.js";
import type { ShareParts } from "./share-links.js";

type ShareError = BadRequest | NotFound;

const NOT_READY =
  "Share links are not ready in this Design Studio process. Restart Design Studio.";

const toShareError = (error: Cause.UnknownError): ShareError => {
  if (error.cause instanceof NotFoundError) {
    return new NotFound({ message: error.cause.message });
  }

  if (error.cause instanceof Error) {
    return new BadRequest({ message: error.cause.message });
  }

  return new BadRequest({ message: String(error.cause) });
};

const attemptShare = <Value>(
  task: (parts: ShareParts) => Promise<Value>
): Effect.Effect<Value, ShareError> =>
  Effect.gen(function* withParts() {
    const parts = toShareParts(loadConfig().dataDir);

    if (parts === null) {
      return yield* new BadRequest({ message: NOT_READY });
    }

    return yield* Effect.tryPromise(() => task(parts)).pipe(
      Effect.mapError((failure) => toShareError(failure))
    );
  });

export { attemptShare };

export type { ShareError };
