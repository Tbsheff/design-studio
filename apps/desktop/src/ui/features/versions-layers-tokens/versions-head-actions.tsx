import { Icon } from "@design-studio/ui";
import { useMemo } from "react";
import type { ReactNode } from "react";

import { COPY } from "./copy.js";
import { VersionMoreMenu } from "./version-more-menu.js";
import type { MoreItem } from "./version-row-types.js";

const HEAD_ICON_SIZE = 14;

interface VersionsHeadActionsProps {
  readonly canNewDirection: boolean;
  readonly canUndo: boolean;
  readonly comparing: boolean;
  readonly hasMenu: boolean;
  readonly onCompare: () => void;
  readonly onNewDirection: () => void;
  readonly onUndo: () => void;
}

const toNewDirectionHint = (canNewDirection: boolean): string | null => {
  if (canNewDirection) {
    return null;
  }

  return COPY.menuNeedsVersion;
};

const VersionsHeadActions = (props: VersionsHeadActionsProps): ReactNode => {
  const { canNewDirection, onNewDirection } = props;

  const items = useMemo(
    (): MoreItem[] => [
      {
        hint: toNewDirectionHint(canNewDirection),
        icon: "branch",
        id: "new-direction",
        label: COPY.directionNew,
        run: onNewDirection,
      },
    ],
    [canNewDirection, onNewDirection]
  );

  return (
    <div className="section-actions versions-head-actions">
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
      {props.hasMenu && (
        <VersionMoreMenu items={items} title={COPY.titleVersions} />
      )}
    </div>
  );
};

export { VersionsHeadActions };
