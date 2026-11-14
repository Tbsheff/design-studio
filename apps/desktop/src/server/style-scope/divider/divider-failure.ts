import { BadRequest } from "@design-studio/actions/_core/errors/bad-request";

import { toDirectEditStatusFailure } from "../../direct-edit/index.js";
import type { DirectEditStatusFailure } from "../../direct-edit/index.js";
import { DividerError } from "./errors.js";

const toDividerFailure = (
  cause: unknown
): BadRequest | DirectEditStatusFailure | null => {
  if (cause instanceof DividerError) {
    return new BadRequest({ message: cause.message });
  }

  return toDirectEditStatusFailure(cause);
};

export { toDividerFailure };
