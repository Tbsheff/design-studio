import type { VersionChanges } from "@design-studio/contracts";
import type { ReactNode } from "react";

import { toFilesChanged, toTotals } from "./compare-code-model.js";
import { COPY } from "./copy.js";
import { DiffBadge } from "./diff-badge.js";

interface CompareSummaryProps {
  readonly changes: VersionChanges;
}

const CompareSummary = ({ changes }: CompareSummaryProps): ReactNode => {
  const { additions, deletions, more } = toTotals(changes);

  return (
    <div className="compare-code-summary">
      <span>{toFilesChanged(changes.totalFiles)}</span>
      <DiffBadge additions={additions} deletions={deletions} />
      {more > 0 && (
        <span className="compare-code-more">{`${more}${COPY.summaryMoreFiles}`}</span>
      )}
    </div>
  );
};

export { CompareSummary };
