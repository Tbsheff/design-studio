import { NotFound } from "@design-studio/actions/_core/errors/not-found";
import { Unavailable } from "@design-studio/actions/_core/errors/unavailable";

import { LayerRefError } from "../../page-probe/index.js";

const toRenderFailure = (cause: unknown): NotFound | Unavailable | null => {
  if (cause instanceof LayerRefError) {
    return new NotFound({ message: cause.message });
  }

  if (cause instanceof Error) {
    return new Unavailable({
      message: `The frame could not be rendered: ${cause.message}`,
    });
  }

  return null;
};

export { toRenderFailure };
