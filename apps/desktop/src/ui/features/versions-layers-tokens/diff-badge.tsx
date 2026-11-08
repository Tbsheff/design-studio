import type { ReactNode } from "react";

interface DiffBadgeProps {
  readonly additions: number;
  readonly deletions: number;
}

const DiffBadge = ({ additions, deletions }: DiffBadgeProps): ReactNode => (
  <span className="diff-badge">
    <span className="diff-plus">{`+${additions}`}</span>
    <span className="diff-minus">{`−${deletions}`}</span>
  </span>
);

export { DiffBadge };
