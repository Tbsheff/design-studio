import { Icon } from "@design-studio/ui";
import { useCallback } from "react";
import type { ReactElement } from "react";

import { tipWithKey } from "../../canvas-toolbar-slots.js";
import { useLive } from "../../platform/live-store.js";
import { copy } from "./copy.js";
import { DropMenu } from "./drop-menu.js";
import type { MenuGroup } from "./top-bar-menu.js";
import { toZoomGroups } from "./zoom-menu-model.js";
import type { ZoomProps } from "./zoom-menu-model.js";

const ZoomPill = ({
  zoom,
  setting,
  onZoomTo,
  onFit,
  onStep,
}: ZoomProps): ReactElement => {
  const percent = useLive(zoom);

  const groups = useCallback(
    (): MenuGroup[] => toZoomGroups({ onFit, onStep, onZoomTo, setting }),
    [onFit, onStep, onZoomTo, setting]
  );

  return (
    <DropMenu
      label={`Zoom ${percent}%`}
      triggerClass="topbar-zoom"
      anchorClass="topbar-fold-narrow"
      groups={groups}
      align="end"
      tip={tipWithKey(`Zoom ${percent}%`, "zoom-fit")}
    >
      <span className="topbar-zoom-value">
        {percent}
        {copy.text2}
      </span>
      <span className="topbar-zoom-icon">
        <Icon name="search" size={14} />
      </span>
    </DropMenu>
  );
};

export { ZoomPill };
