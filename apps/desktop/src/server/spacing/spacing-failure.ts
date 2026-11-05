import { BadRequest } from "@design-studio/actions/_core/errors/bad-request";

import { SpacingError } from "./errors.js";

const toSpacingFailure = (cause: unknown): BadRequest | null => {
  if (cause instanceof SpacingError) {
    return new BadRequest({ message: cause.message });
  }

  return null;
};

export { toSpacingFailure };
