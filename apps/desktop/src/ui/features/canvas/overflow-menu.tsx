import { Icon } from "@design-studio/ui";
import { useCallback } from "react";
import type { ReactElement } from "react";

import { useLive } from "../../platform/live-store.js";
import { DropMenu } from "./drop-menu.js";
import { toOverflowGroups } from "./overflow-menu-model.js";
import type { MenuEntry } from "./top-bar-menu.js";
import { useVectorTool } from "./vector-tool-model.js";
import type { ZoomProps } from "./zoom-menu-model.js";

interface OverflowProps {
  readonly zoom: ZoomProps;
  readonly present: MenuEntry[];
  readonly isViewOpen: boolean;
  readonly onToggleView: () => void;
  readonly onReload: () => void;
  readonly isTweakOpen: boolean;
  readonly isTweakDisabled: boolean;
  readonly onTweak: () => void;
}

const OverflowMenu = (props: OverflowProps): ReactElement => {
  const percent = useLive(props.zoom.zoom);
  const vectorState = useVectorTool();

  const groups = useCallback(
    () => toOverflowGroups({ ...props, percent, vectorState }),
    [props, percent, vectorState]
  );

  return (
    <DropMenu
      label="More actions"
      triggerClass="icon-btn topbar-icon topbar-overflow"
      anchorClass="topbar-overflow-anchor"
      groups={groups}
      align="end"
      tip="More actions"
    >
      <Icon name="more" size={14} />
    </DropMenu>
  );
};

export { OverflowMenu };
