import { BadRequest } from "@design-studio/actions/_core/errors/bad-request";

import { toDirectEditStatusFailure } from "../direct-edit/index.js";
import type { DirectEditStatusFailure } from "../direct-edit/index.js";
import { SpacingError } from "./errors.js";

const toSpacingFailure = (
  cause: unknown
): BadRequest | DirectEditStatusFailure | null => {
  if (cause instanceof SpacingError) {
    return new BadRequest({ message: cause.message });
  }

  return toDirectEditStatusFailure(cause);
};

export { toSpacingFailure };
