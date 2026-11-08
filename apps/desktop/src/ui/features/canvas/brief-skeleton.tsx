import type { ReactElement } from "react";

const BRIEF_LABELS = ["A", "B", "C", "D"];

interface BriefSkeletonProps {
  readonly count: number;
}

const toSkeletonRow = (label: string): ReactElement => (
  <li key={label} className="variation-brief-row skeleton">
    <span className="badge">{label}</span>
    <span className="skeleton-lines" aria-hidden="true">
      <span />
      <span />
    </span>
  </li>
);

const BriefSkeleton = ({ count }: BriefSkeletonProps): ReactElement => (
  <ol className="variation-briefs" aria-busy="true">
    {BRIEF_LABELS.slice(0, count).map((label) => toSkeletonRow(label))}
  </ol>
);

export { BriefSkeleton };
