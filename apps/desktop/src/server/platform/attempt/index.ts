import { Effect } from "effect";

import { BadRequest } from "../../../shared/actions/_core/errors/bad-request.js";
import { Conflict } from "../../../shared/actions/_core/errors/conflict.js";
import {
  BAD_REQUEST,
  CONFLICT,
  NOT_FOUND,
} from "../../../shared/actions/_core/errors/http-status-codes.js";
import { NotFound } from "../../../shared/actions/_core/errors/not-found.js";
import { BadRequestError } from "../errors/bad-request.js";
import { ConflictError } from "../errors/conflict.js";
import { NotFoundError } from "../errors/not-found.js";

type KnownFailure = BadRequest | Conflict | NotFound;

type Refine<Extra> = (cause: unknown) => Extra | null;

interface StatusError extends Error {
  readonly status?: number;
}

type MakeFailure = (message: string) => KnownFailure;

const STATUS_FAILURES: ReadonlyMap<number, MakeFailure> = new Map<
  number,
  MakeFailure
>([
  [BAD_REQUEST, (message) => new BadRequest({ message })],
  [CONFLICT, (message) => new Conflict({ message })],
  [NOT_FOUND, (message) => new NotFound({ message })],
]);

const byStatus = (cause: StatusError): KnownFailure | null => {
  const make = STATUS_FAILURES.get(cause.status ?? 0) ?? null;

  if (make === null) {
    return null;
  }

  return make(cause.message);
};

const knownOf = (cause: unknown): KnownFailure | null => {
  if (cause instanceof NotFoundError) {
    return new NotFound({ message: cause.message });
  }

  if (cause instanceof ConflictError) {
    return new Conflict({ message: cause.message });
  }

  if (cause instanceof BadRequestError) {
    return new BadRequest({ message: cause.message });
  }

  if (cause instanceof Error) {
    return byStatus(cause);
  }

  return null;
};

const refineNone = (): null => null;

const toFailure = <Extra>(
  cause: unknown,
  refine: Refine<Extra>
): Effect.Effect<never, Extra | KnownFailure> => {
  const failure = refine(cause) ?? knownOf(cause);

  if (failure === null) {
    return Effect.die(cause);
  }

  return Effect.fail(failure);
};

const attemptKnown = <Value, Extra = never>(
  task: () => Promise<Value>,
  refine: Refine<Extra> = refineNone
): Effect.Effect<Value, Extra | KnownFailure> =>
  Effect.tryPromise({ catch: (error) => error, try: task }).pipe(
    Effect.matchEffect({
      onFailure: (error) => toFailure(error, refine),
      onSuccess: (value) => Effect.succeed(value),
    })
  );

export { attemptKnown, knownOf };

export type { KnownFailure, Refine };
