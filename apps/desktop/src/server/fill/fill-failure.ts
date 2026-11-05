import { BadRequest } from "@design-studio/actions/_core/errors/bad-request";

import { FillError } from "./errors.js";

const toFillFailure = (cause: unknown): BadRequest | null => {
  if (cause instanceof FillError) {
    return new BadRequest({ message: cause.message });
  }

  return null;
};

export { toFillFailure };
