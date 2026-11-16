import type { ReactNode } from "react";

import type { LiveStore } from "../../platform/live-store.js";
import type { ZoomSetting } from "../../platform/storage.js";
import type { TopBarHosts } from "./canvas-shell.js";
import type {
  CanvasTool,
  MenuGroup,
  PresentMode,
} from "./top-bar-menu-model.js";

interface Props {
  matrix?: ReactNode;
  account?: ReactNode;
  hosts: TopBarHosts | null;
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
  vectorAvailable: boolean;
  onTool: (tool: Exclude<CanvasTool, null>) => void;
  onPresent: (mode: PresentMode) => void;
  canPlay: boolean;
  presentDisabled: boolean;
  canExport: boolean;
  onExport: () => void;
  onShip?: (() => void) | null;
  onShareLink?: ((mode?: "link" | "publish") => void) | null;
}

export type { Props };
