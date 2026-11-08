import type { VersionFileDiff } from "@design-studio/contracts";
import { useCallback } from "react";
import type { ReactNode } from "react";

import type { PatchHunk } from "../../../shared/hunk.js";
import { canReview, toHunkRows } from "./compare-code-model.js";
import { DiffRow } from "./diff-row.js";
import { HunkHead } from "./hunk-head.js";
import { hunkKey } from "./use-hunk-review.js";
import type { HunkReview } from "./use-hunk-review.js";

const GROUP_ROLE = "rowgroup";

interface HunkBlockProps {
  readonly file: VersionFileDiff;
  readonly hunk: PatchHunk;
  readonly review: HunkReview;
}

const HunkBlock = ({ file, hunk, review }: HunkBlockProps): ReactNode => {
  const key = hunkKey(file.path, hunk.index);
  const state = review.states[key] ?? null;

  const handleKeep = useCallback((): void => {
    review.keep(key);
  }, [key, review]);

  const handleUndo = useCallback((): void => {
    review.undo(key, file.path, hunk.index);
  }, [file.path, hunk.index, key, review]);

  return (
    <div
      className={`hunk ${state?.kind ?? ""}`}
      role={GROUP_ROLE}
      data-hunk={hunk.index}
    >
      <HunkHead
        header={hunk.header}
        index={hunk.index}
        state={state}
        reviewable={canReview(file, hunk)}
        onKeep={handleKeep}
        onUndo={handleUndo}
      />
      {state?.kind === "error" && (
        <div className="hunk-error" role="alert">
          {state.message}
        </div>
      )}
      {toHunkRows(hunk).map((line) => (
        <DiffRow key={`${line.kind}:${line.oldNo}:${line.newNo}`} line={line} />
      ))}
    </div>
  );
};

export { HunkBlock };
