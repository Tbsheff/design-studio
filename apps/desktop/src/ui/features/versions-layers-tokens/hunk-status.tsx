import { Icon } from "@design-studio/ui";
import type { ReactNode } from "react";

import { COPY } from "./copy.js";
import type { HunkState } from "./use-hunk-review.js";

const STATUS_ICON_SIZE = 12;

interface HunkStatusProps {
  readonly state: HunkState | null;
}

const HunkStatus = ({ state }: HunkStatusProps): ReactNode => {
  if (state?.kind === "kept") {
    return (
      <span className="hunk-status kept">
        <Icon name="check" size={STATUS_ICON_SIZE} />
        {COPY.hunkKept}
      </span>
    );
  }

  if (state?.kind === "undone") {
    return (
      <span
        className="hunk-status undone"
        data-tip={`${COPY.hunkSavedPrefix}${state.title}${COPY.hunkSavedSuffix}`}
      >
        <Icon name="undo" size={STATUS_ICON_SIZE} />
        {COPY.hunkUndone}
      </span>
    );
  }

  return null;
};

export { HunkStatus };
