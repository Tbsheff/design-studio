import type { ReactNode } from "react";

import { COPY } from "./copy.js";
import { HunkActions } from "./hunk-actions.js";
import { HunkStatus } from "./hunk-status.js";
import type { HunkState } from "./use-hunk-review.js";

const ROW_ROLE = "row";

interface HunkHeadProps {
  readonly header: string;
  readonly index: number;
  readonly onKeep: () => void;
  readonly onUndo: () => void;
  readonly reviewable: boolean;
  readonly state: HunkState | null;
}

const HunkHead = (props: HunkHeadProps): ReactNode => {
  const { state } = props;
  const isSettled = state?.kind === "undone" || state?.kind === "busy";

  return (
    <div className="hunk-head diff-gap" role={ROW_ROLE}>
      <span className="hunk-range truncate">{props.header}</span>
      <HunkStatus state={state} />
      {props.reviewable && !isSettled && (
        <HunkActions
          index={props.index}
          state={state}
          onKeep={props.onKeep}
          onUndo={props.onUndo}
        />
      )}
      {state?.kind === "busy" && (
        <output className="hunk-status">{COPY.hunkUndoing}</output>
      )}
    </div>
  );
};

export { HunkHead };
