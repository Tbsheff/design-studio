import { BadRequest } from "@design-studio/actions/_core/errors/bad-request";

import { toDirectEditStatusFailure } from "../direct-edit/index.js";
import type { DirectEditStatusFailure } from "../direct-edit/index.js";
import { StateStyleError } from "./errors.js";

const toStateStyleFailure = (
  cause: unknown
): BadRequest | DirectEditStatusFailure | null => {
  if (cause instanceof StateStyleError) {
    return new BadRequest({ message: cause.message });
  }

  return toDirectEditStatusFailure(cause);
};

export { toStateStyleFailure };
