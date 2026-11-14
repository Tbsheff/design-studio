import type { StudioError } from "@design-studio/actions/_core/errors/all";
import type { HttpStatus } from "@design-studio/actions/_core/errors/http-status-codes";
import { statusOf } from "@design-studio/actions/_core/http-status";
import { toWire } from "@design-studio/actions/_core/wire";
import type { WireBody, WireData } from "@design-studio/actions/_core/wire";
import { Cause, Exit } from "effect";

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
