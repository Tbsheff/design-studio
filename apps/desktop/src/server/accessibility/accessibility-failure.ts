import { BadRequest } from "@design-studio/actions/_core/errors/bad-request";

import { toDirectEditStatusFailure } from "../direct-edit/index.js";
import type { DirectEditStatusFailure } from "../direct-edit/index.js";
import { AccessibilityError } from "./errors.js";

const toAccessibilityFailure = (
  cause: unknown
): BadRequest | DirectEditStatusFailure | null => {
  if (cause instanceof AccessibilityError) {
    return new BadRequest({ message: cause.message });
  }

  return toDirectEditStatusFailure(cause);
};

export { toAccessibilityFailure };
