import { Icon } from "@design-studio/ui";
import type { ReactNode } from "react";

import { COPY } from "./copy.js";

const HEAD_ICON_SIZE = 14;

interface VersionsHeadActionsProps {
  readonly canUndo: boolean;
  readonly comparing: boolean;
  readonly onCompare: () => void;
  readonly onUndo: () => void;
}

const VersionsHeadActions = (props: VersionsHeadActionsProps): ReactNode => (
  <div className="section-actions">
    {props.comparing && (
      <button
        type="button"
        className="btn small primary has-icon"
        onClick={props.onCompare}
      >
        <Icon name="compare" size={HEAD_ICON_SIZE} />
        {COPY.headCompare}
      </button>
    )}
    <button
      type="button"
      className="btn ghost small has-icon"
      aria-label={COPY.labelUndo}
      aria-keyshortcuts="Meta+Z Control+Z"
      data-tip={COPY.tipUndoTheHeadVersionZ}
      data-tip-align="end"
      onClick={props.onUndo}
      disabled={!props.canUndo}
    >
      <Icon name="undo" size={HEAD_ICON_SIZE} />
      {COPY.headUndo}
    </button>
  </div>
);

export { VersionsHeadActions };
