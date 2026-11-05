import { BadRequest } from "@design-studio/actions/_core/errors/bad-request";

import { toDirectEditStatusFailure } from "../../direct-edit/index.js";
import type { DirectEditStatusFailure } from "../../direct-edit/index.js";
import { ComponentVariantError } from "./errors.js";

const toComponentVariantFailure = (
  cause: unknown
): BadRequest | DirectEditStatusFailure | null => {
  if (cause instanceof ComponentVariantError) {
    return new BadRequest({ message: cause.message });
  }

  return toDirectEditStatusFailure(cause);
};

export { toComponentVariantFailure };
