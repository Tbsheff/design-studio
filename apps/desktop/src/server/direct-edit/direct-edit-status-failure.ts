import { BadRequest } from "@design-studio/actions/_core/errors/bad-request";
import { Conflict } from "@design-studio/actions/_core/errors/conflict";
import { NotFound } from "@design-studio/actions/_core/errors/not-found";

import { DirectEditError } from "./engine/errors.js";

const STATUS_FAILURES = [BadRequest, Conflict, NotFound] as const;

type DirectEditStatusFailure = InstanceType<(typeof STATUS_FAILURES)[number]>;

const CONFLICT_STATUS = 409;

const NOT_FOUND_STATUS = 404;

const toDirectEditStatusFailure = (
  cause: unknown
): DirectEditStatusFailure | null => {
  if (!(cause instanceof DirectEditError)) {
    return null;
  }

  if (cause.status === CONFLICT_STATUS) {
    return new Conflict({ message: cause.message });
  }

  if (cause.status === NOT_FOUND_STATUS) {
    return new NotFound({ message: cause.message });
  }

  return new BadRequest({ message: cause.message });
};

export { toDirectEditStatusFailure };

export type { DirectEditStatusFailure };
