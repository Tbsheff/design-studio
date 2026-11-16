import type { ZoomKey } from "@design-studio/contracts";
import { useMemo } from "react";
import type { ReactElement } from "react";

import { useLive } from "../../platform/live-store.js";
import { FRAME_PRESETS } from "./canvas-frame-ops.js";
import { copy } from "./copy.js";
import type { MenuPoint, PreviewMenuItem } from "./preview-menu-model.js";
import { PreviewItemsSubmenu } from "./preview-items-submenu.js";
import { PreviewMenu } from "./preview-menu.js";
import {
  closeStageMenu,
  requestStagePaste,
  stageMenuStore,
} from "./stage-menu-model.js";
import type { ZoomSource } from "./use-zoom-input.js";

interface FrameSize {
  readonly height: number;
  readonly width: number;
}

interface StageMenuProps {
  readonly addFrame: (size: FrameSize) => void;
  readonly zoomBy: (key: ZoomKey, source: ZoomSource) => void;
}

const toPresetItems = (
  addFrame: StageMenuProps["addFrame"]
): PreviewMenuItem[] =>
  FRAME_PRESETS.map((preset) => ({
    icon: preset.preset,
    id: `add-${preset.preset}`,
    label: preset.label,
    run: () => addFrame({ height: preset.height, width: preset.width }),
  }));

const toStageItems = (
  at: MenuPoint,
  props: StageMenuProps
): PreviewMenuItem[] => [
  {
    icon: "copy",
    id: "paste",
    label: copy.stageMenuPaste,
    run: () => requestStagePaste(at),
  },
  {
    icon: "search",
    id: "fit",
    keyId: "zoom-fit",
    label: copy.stageMenuFit,
    run: () => props.zoomBy("fit", "menu"),
  },
  {
    icon: "frame",
    id: "add-frame",
    label: copy.stageMenuAddFrame,
    run: closeStageMenu,
    submenu: (
      <PreviewItemsSubmenu
        items={toPresetItems(props.addFrame)}
        label={copy.stageMenuAddFrame}
        onClose={closeStageMenu}
      />
    ),
  },
];

const StageMenu = (props: StageMenuProps): ReactElement | null => {
  const at = useLive(stageMenuStore);
  const { addFrame, zoomBy } = props;

  const items = useMemo(() => {
    if (at === null) {
      return [];
    }

    return toStageItems(at, { addFrame, zoomBy });
  }, [at, addFrame, zoomBy]);

  if (at === null) {
    return null;
  }

  return (
    <PreviewMenu
      at={at}
      label={copy.stageMenu}
      items={items}
      onClose={closeStageMenu}
    />
  );
};

export { StageMenu };
