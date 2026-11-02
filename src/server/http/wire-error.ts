import { Cause, Exit } from "effect";

import type { StudioError } from "../../shared/actions/_core/errors/all.js";
import type { HttpStatus } from "../../shared/actions/_core/errors/http-status-codes.js";
import { statusOf } from "../../shared/actions/_core/http-status.js";
import { toWire } from "../../shared/actions/_core/wire.js";
import type { WireBody, WireData } from "../../shared/actions/_core/wire.js";

interface WireError {
  readonly body: WireBody & WireData;
  readonly status: HttpStatus;
}

const toWireError = (error: StudioError | null): WireError => {
  if (error === null) {
    return { body: toWire(null), status: statusOf("Defect") };
  }

  return { body: toWire(error), status: statusOf(error._tag) };
};

const failureOf = (
  exit: Exit.Exit<object, StudioError>
): StudioError | null => {
  if (Exit.isSuccess(exit)) {
    return null;
  }

  const failure = exit.cause.reasons.find(Cause.isFailReason);

  if (!failure) {
    return null;
  }

  return failure.error;
};

export { failureOf, toWireError };

export type { WireError };
