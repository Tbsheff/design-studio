import { Effect } from "effect";
import type { Cause } from "effect";

import { BadRequest } from "../../shared/actions/_core/errors/bad-request.js";
import { Conflict } from "../../shared/actions/_core/errors/conflict.js";
import { NotFound } from "../../shared/actions/_core/errors/not-found.js";
import { ConflictError } from "../platform/errors/conflict.js";
import { BadRequestError, NotFoundError } from "../store/errors.js";
import { runtimeOf } from "./links/link-runtime.js";
import type { LinkRuntime } from "./links/link-runtime.js";

type CanvasFailure = BadRequest | Conflict | NotFound;

const NOT_READY =
  "The canvas is not ready in this Design Studio process. Restart Design Studio.";

const toCanvasError = (error: Cause.UnknownError): CanvasFailure => {
  const { cause } = error;

  if (cause instanceof NotFoundError) {
    return new NotFound({ message: cause.message });
  }

  if (cause instanceof ConflictError) {
    return new Conflict({ message: cause.message });
  }

  if (cause instanceof BadRequestError || cause instanceof Error) {
    return new BadRequest({ message: cause.message });
  }

  return new BadRequest({ message: String(cause) });
};

const attemptCanvas = <Value>(
  task: (runtime: LinkRuntime) => Promise<Value>
): Effect.Effect<Value, CanvasFailure> =>
  Effect.gen(function* withRuntime() {
    const runtime = runtimeOf();

    if (runtime === null) {
      return yield* new BadRequest({ message: NOT_READY });
    }

    return yield* Effect.tryPromise(() => task(runtime)).pipe(
      Effect.mapError((failure) => toCanvasError(failure))
    );
  });

export { attemptCanvas };

export type { CanvasFailure };
