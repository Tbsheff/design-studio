import { BadRequest } from "@design-studio/actions/_core/errors/bad-request";
import { Forbidden } from "@design-studio/actions/_core/errors/forbidden";

import { toDirectEditStatusFailure } from "../../direct-edit/index.js";
import type { DirectEditStatusFailure } from "../../direct-edit/index.js";
import { ForbiddenError } from "../../platform/errors/index.js";
import { TextSearchError } from "./errors.js";

const toTextSearchFailure = (
  cause: unknown
): BadRequest | DirectEditStatusFailure | null => {
  if (cause instanceof TextSearchError) {
    return new BadRequest({ message: cause.message });
  }

  return toDirectEditStatusFailure(cause);
};

type TextWriteFailure = BadRequest | DirectEditStatusFailure | Forbidden;

const toTextWriteFailure = (cause: unknown): TextWriteFailure | null => {
  if (cause instanceof ForbiddenError) {
    return new Forbidden({ message: cause.message, perm: "studio.write" });
  }

  return toTextSearchFailure(cause);
};

export { toTextSearchFailure, toTextWriteFailure };

export type { TextWriteFailure };
