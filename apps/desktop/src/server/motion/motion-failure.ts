import { BadRequest } from "@design-studio/actions/_core/errors/bad-request";

import { MotionError } from "./site.js";

const toMotionFailure = (cause: unknown): BadRequest | null => {
  if (cause instanceof MotionError) {
    return new BadRequest({ message: cause.message });
  }

  return null;
};

export { toMotionFailure };
