import { BadRequest } from "@design-studio/actions/_core/errors/bad-request";

import { toDirectEditStatusFailure } from "./deps.js";
import type { DirectEditStatusFailure } from "./deps.js";
import { KitDriftError } from "./errors.js";

const toKitDriftFailure = (
  cause: unknown
): BadRequest | DirectEditStatusFailure | null => {
  if (cause instanceof KitDriftError) {
    return new BadRequest({ message: cause.message });
  }

  return toDirectEditStatusFailure(cause);
};

export { toKitDriftFailure };
