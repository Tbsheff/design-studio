import type { ToolDiff } from "@design-studio/contracts";
import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { DiffHunk } from "./diff-hunk.js";

const toEmptyText = (diff: ToolDiff): string => {
  if (diff.truncated) {
    return "The file is too large to show a diff.";
  }

  return "No line changes.";
};

const DiffView = ({ diff }: { diff: ToolDiff }): ReactElement => {
  if (diff.hunks.length === 0) {
    return <p className="diff-empty text-xs">{toEmptyText(diff)}</p>;
  }

  return (
    <div className="diff-view" data-testid="diff-view">
      {diff.hunks.map((hunk, index) => (
        <DiffHunk
          key={`${hunk.oldStart}-${hunk.newStart}`}
          hasGap={index > 0}
          hunk={hunk}
        />
      ))}
      {diff.truncated && (
        <p className="diff-empty text-xs">{copy.theDiffIsCut}</p>
      )}
    </div>
  );
};

export { DiffView };
