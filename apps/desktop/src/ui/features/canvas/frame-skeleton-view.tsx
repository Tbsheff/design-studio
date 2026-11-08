import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { SkeletonPage } from "./frame-skeleton-page.js";

const FrameSkeleton = ({
  step,
  page,
  missing,
}: {
  step: string | null;
  page?: string;
  missing?: string;
}): ReactElement => {
  if (missing) {
    return (
      <output className="frame-skeleton idle" data-testid="frame-missing">
        <div className="frame-skeleton-step">
          <span className="frame-skeleton-text">
            {copy.noPageAt}
            {missing}
            {copy.yet}
          </span>
        </div>
      </output>
    );
  }

  return (
    <output
      className="frame-skeleton"
      aria-live="polite"
      data-testid="frame-skeleton"
    >
      <SkeletonPage />
      <div className="frame-skeleton-step">
        <span className="spinner" aria-hidden="true" />
        <span className="frame-skeleton-text">
          {step ?? "Building the first version"}
        </span>
        {page && <span className="frame-skeleton-page-name">{page}</span>}
      </div>
    </output>
  );
};

export { FrameSkeleton };
