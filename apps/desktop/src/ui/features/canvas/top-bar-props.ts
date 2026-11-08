import type { ReactNode } from "react";

import type { LiveStore } from "../../platform/live-store.js";
import type { ZoomSetting } from "../../platform/storage.js";
import type {
  CanvasTool,
  MenuGroup,
  PresentMode,
} from "./top-bar-menu-model.js";

interface Props {
  vectorTools?: ReactNode;
  matrix?: ReactNode;
  paneCollapsed: boolean;
  onExpandPane: () => void;
  onReload: () => void;
  onAskChat: () => void;
  fileName: string;
  fileMenu: () => MenuGroup[];
  onFileMenuOpen: () => void;
  zoom: LiveStore<number>;
  zoomSetting: ZoomSetting;
  onZoomTo: (zoomValue: number) => void;
  onZoomStep: (delta: 1 | -1) => void;
  onFit: () => void;
  tool: CanvasTool;
  commentAvailable: boolean;
  onTool: (tool: Exclude<CanvasTool, null>) => void;
  viewOpen: boolean;
  onToggleView: () => void;
  onPresent: (mode: PresentMode) => void;
  presentDisabled: boolean;
  canExport: boolean;
  onExport: () => void;
  onShip?: (() => void) | null;
  onShareLink?: ((mode?: "link" | "publish") => void) | null;
}

export type { Props };
