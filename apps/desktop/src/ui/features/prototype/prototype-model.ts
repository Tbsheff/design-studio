import { copy } from "./copy.js";

const toCreateLabel = (isPending: boolean): string => {
  if (isPending) {
    return copy.creating;
  }

  return copy.create;
};

export { toCreateLabel };
