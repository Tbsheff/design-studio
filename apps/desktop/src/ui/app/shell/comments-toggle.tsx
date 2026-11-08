import { useCallback } from "react";
import type { ReactElement } from "react";

import { pick } from "../../platform/pick.js";
import type { PanelTab } from "../../platform/use-panel-tab";
import { PaneHeadToggle } from "./pane-head-toggle";

interface CommentsToggleProps {
  readonly count: number;
  readonly onTab: (tab: PanelTab) => void;
  readonly tab: PanelTab;
}

const CommentsToggle = ({
  count,
  onTab,
  tab,
}: CommentsToggleProps): ReactElement => {
  const isOn = tab === "comments";

  const toggle = useCallback(
    () => onTab(pick(isOn, "chat", "comments")),
    [isOn, onTab]
  );

  return (
    <PaneHeadToggle
      extraClass=""
      icon="comment"
      isPressed={isOn}
      label="Comments"
      onClick={toggle}
      tip="Comments"
    >
      {count > 0 && <span className="pane-head-badge">{count}</span>}
    </PaneHeadToggle>
  );
};

export { CommentsToggle };
