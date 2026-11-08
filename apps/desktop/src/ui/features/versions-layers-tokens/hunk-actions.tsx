import type { ReactNode } from "react";

import { COPY } from "./copy.js";
import type { HunkState } from "./use-hunk-review.js";

const ACTIONS_ROLE = "group";

interface HunkActionsProps {
  readonly index: number;
  readonly onKeep: () => void;
  readonly onUndo: () => void;
  readonly state: HunkState | null;
}

const HunkActions = ({
  index,
  onKeep,
  onUndo,
  state,
}: HunkActionsProps): ReactNode => {
  const isKept = state?.kind === "kept";
  let keepTip: string = COPY.hunkKeepTip;

  if (isKept) {
    keepTip = COPY.hunkNotReviewedTip;
  }

  return (
    <span
      className="hunk-actions"
      role={ACTIONS_ROLE}
      aria-label={`${COPY.hunkChangePrefix}${index}`}
    >
      <button
        type="button"
        className="hunk-btn"
        aria-pressed={isKept}
        data-tip={keepTip}
        onClick={onKeep}
      >
        {COPY.hunkKeep}
      </button>
      <button
        type="button"
        className="hunk-btn"
        data-tip={COPY.tipUndoOnlyThisChangeInTheHeadAsANewVersion}
        onClick={onUndo}
      >
        {COPY.hunkUndo}
      </button>
    </span>
  );
};

export { HunkActions };
