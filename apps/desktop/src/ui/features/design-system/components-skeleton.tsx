import type { ReactElement } from "react";

import { COPY } from "./copy.js";

const SKELETON_KEYS = ["a", "b", "c", "d"];

const ComponentsSkeleton = ({
  isShown,
}: {
  isShown: boolean;
}): ReactElement | null => {
  if (!isShown) {
    return null;
  }

  return (
    <ul
      className="cmp-grid"
      aria-busy="true"
      aria-label={COPY.labelLoadingComponents}
    >
      {SKELETON_KEYS.map((key) => (
        <li key={key} className="cmp-skeleton" />
      ))}
    </ul>
  );
};

export { ComponentsSkeleton };
