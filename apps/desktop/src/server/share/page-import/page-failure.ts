import { BadRequest } from "@design-studio/actions/_core/errors/bad-request";

import { toDirectEditStatusFailure } from "../../direct-edit/index.js";
import type { DirectEditStatusFailure } from "../../direct-edit/index.js";
import { PageImportError } from "./errors.js";

const toPageFailure = (
  cause: unknown
): BadRequest | DirectEditStatusFailure | null => {
  if (cause instanceof PageImportError) {
    return new BadRequest({ message: cause.message });
  }

  return toDirectEditStatusFailure(cause);
};

export { toPageFailure };
