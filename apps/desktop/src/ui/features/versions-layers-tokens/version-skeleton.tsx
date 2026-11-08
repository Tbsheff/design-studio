import type { ReactNode } from "react";

const VersionSkeleton = (): ReactNode => (
  <div className="version-skeleton" aria-hidden="true">
    <span className="version-skeleton-thumb" />
    <span className="skeleton-lines">
      <span />
      <span />
    </span>
  </div>
);

export { VersionSkeleton };
