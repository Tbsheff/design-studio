import { BadRequest } from "@design-studio/actions/_core/errors/bad-request";

import { toDirectEditStatusFailure } from "../direct-edit/index.js";
import type { DirectEditStatusFailure } from "../direct-edit/index.js";
import { TextSearchError } from "./errors.js";

const toTextSearchFailure = (
  cause: unknown
): BadRequest | DirectEditStatusFailure | null => {
  if (cause instanceof TextSearchError) {
    return new BadRequest({ message: cause.message });
  }

  return toDirectEditStatusFailure(cause);
};

export { toTextSearchFailure };
