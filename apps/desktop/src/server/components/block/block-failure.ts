import { BadRequest } from "@design-studio/actions/_core/errors/bad-request";

import { toDirectEditStatusFailure } from "./deps.js";
import type { KnownFailure } from "./deps.js";
import { BlockError } from "./errors.js";

const toBlockFailure = (cause: unknown): BadRequest | KnownFailure | null => {
  if (cause instanceof BlockError) {
    return new BadRequest({ message: cause.message });
  }

  return toDirectEditStatusFailure(cause);
};

export { toBlockFailure };
