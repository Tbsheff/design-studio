import { Unavailable } from "@design-studio/actions/_core/errors/unavailable";

import { RegistryUnavailableError } from "./errors.js";

const toRegistryFailure = (cause: unknown): Unavailable | null => {
  if (cause instanceof RegistryUnavailableError) {
    return new Unavailable({ message: cause.message });
  }

  return null;
};

export { toRegistryFailure };
