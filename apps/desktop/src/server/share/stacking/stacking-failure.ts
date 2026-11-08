import { BadRequest } from "@design-studio/actions/_core/errors/bad-request";

import { toDirectEditStatusFailure } from "../../direct-edit/index.js";
import type { DirectEditStatusFailure } from "../../direct-edit/index.js";
import { StackingError } from "./errors.js";

const toStackingFailure = (
  cause: unknown
): BadRequest | DirectEditStatusFailure | null => {
  if (cause instanceof StackingError) {
    return new BadRequest({ message: cause.message });
  }

  return toDirectEditStatusFailure(cause);
};

export { toStackingFailure };
