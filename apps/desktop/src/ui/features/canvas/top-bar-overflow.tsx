import { Icon } from "@design-studio/ui";
import { useCallback } from "react";
import type { ReactElement } from "react";

import { useLive } from "../../platform/live-store.js";
import { DropMenu } from "./top-bar-drop.js";
import { toOverflowGroups } from "./top-bar-overflow-model.js";
import type { OverflowProps } from "./top-bar-overflow-model.js";
import { useVectorTool } from "./vector-tool-model.js";

const OverflowMenu = (overflowProps: OverflowProps): ReactElement => {
  const percent = useLive(overflowProps.zoom.zoom);
  const activeTool = useVectorTool();

  const groups = useCallback(
    () => toOverflowGroups(overflowProps, percent, activeTool),
    [overflowProps, percent, activeTool]
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
