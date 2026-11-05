import { BadRequest } from "@design-studio/actions/_core/errors/bad-request";

import { StackingError } from "./errors.js";

const toStackingFailure = (cause: unknown): BadRequest | null => {
  if (cause instanceof StackingError) {
    return new BadRequest({ message: cause.message });
  }

  return null;
};

export { toStackingFailure };
