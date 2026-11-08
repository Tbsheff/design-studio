import type { ReactNode } from "react";

import { COPY } from "./copy.js";
import { VersionSkeleton } from "./version-skeleton.js";

const SKELETON_ROWS = ["first", "second", "third"];

interface VersionsEmptyProps {
  readonly count: number;
  readonly isLoading: boolean;
}

const VersionsEmpty = ({ count, isLoading }: VersionsEmptyProps): ReactNode => {
  if (count > 0) {
    return null;
  }

  if (isLoading) {
    return (
      <output className="version-skeletons" aria-busy="true">
        <span className="sr-only">{COPY.versionsLoading}</span>
        {SKELETON_ROWS.map((row) => (
          <VersionSkeleton key={row} />
        ))}
      </output>
    );
  }

  return <div className="empty-note">{COPY.versionsEmpty}</div>;
};

export { VersionsEmpty };
