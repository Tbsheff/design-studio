import type { RefObject } from "react";

import type { ZoomSetting } from "../../platform/storage.js";
import type { Box } from "./canvas-frames-model.js";

interface PanZoomLayout {
  activeId: string;
  active: Box;
  bounds: Box;
}

interface Options {
  stageRef: RefObject<HTMLDivElement | null>;
  artboardRef: RefObject<HTMLDivElement | null>;
  layout: PanZoomLayout;
  setting: ZoomSetting;
  selectionRect: () => Box | null;
}

export type { Options, PanZoomLayout };
