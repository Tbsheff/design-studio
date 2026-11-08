import { BadRequest } from "@design-studio/actions/_core/errors/bad-request";
import { NotFound } from "@design-studio/actions/_core/errors/not-found";

import { EditError, LayerRefError, toDirectEditStatusFailure } from "./deps.js";
import type { DirectEditStatusFailure } from "./deps.js";
import { LayerStyleError } from "./errors.js";

type LayerStyleFailure = BadRequest | DirectEditStatusFailure | NotFound;

const toLayerStyleFailure = (cause: unknown): LayerStyleFailure | null => {
  if (cause instanceof LayerRefError) {
    return new NotFound({ message: cause.message });
  }

  if (cause instanceof EditError || cause instanceof LayerStyleError) {
    return new BadRequest({ message: cause.message });
  }

  return toDirectEditStatusFailure(cause);
};

export { toLayerStyleFailure };

export type { LayerStyleFailure };
