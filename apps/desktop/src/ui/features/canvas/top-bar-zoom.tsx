import { Icon } from "@design-studio/ui";
import { useCallback } from "react";
import type { ReactElement } from "react";

import { tipWithKey } from "../../canvas-toolbar-slots.js";
import { useLive } from "../../platform/live-store.js";
import { copy } from "./copy.js";
import type { ThemeControl } from "./theme-switch.js";
import { DropMenu } from "./top-bar-drop.js";
import { zoomGroups } from "./top-bar-zoom-model.js";
import type { ZoomProps } from "./top-bar-zoom-model.js";

const ZoomPill = ({
  control: zoomProps,
  theme,
}: {
  control: ZoomProps;
  theme: ThemeControl | null;
}): ReactElement => {
  const percent = useLive(zoomProps.zoom);

  const groups = useCallback(
    () => zoomGroups(zoomProps, theme),
    [zoomProps, theme]
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
