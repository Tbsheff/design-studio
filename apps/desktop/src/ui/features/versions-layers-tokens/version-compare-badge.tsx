import type { ReactNode } from "react";

import { COPY } from "./copy.js";

interface VersionCompareBadgeProps {
  readonly side: string;
}

const VersionCompareBadge = ({ side }: VersionCompareBadgeProps): ReactNode => (
  <span
    className="badge accent version-side"
    data-tip={`${COPY.compareSidePrefix}${side}`}
  >
    <span aria-hidden="true">{side}</span>
    <span className="sr-only">{`${COPY.compareSidePrefix}${side}`}</span>
  </span>
);

export { VersionCompareBadge };
