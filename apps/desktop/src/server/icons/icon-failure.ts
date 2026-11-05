import { BadRequest } from "@design-studio/actions/_core/errors/bad-request";

import { toDirectEditStatusFailure } from "../direct-edit/index.js";
import type { DirectEditStatusFailure } from "../direct-edit/index.js";
import { IconError } from "./set.js";

const toIconFailure = (
  cause: unknown
): BadRequest | DirectEditStatusFailure | null => {
  if (cause instanceof IconError) {
    return new BadRequest({ message: cause.message });
  }

  return toDirectEditStatusFailure(cause);
};

export { toIconFailure };
