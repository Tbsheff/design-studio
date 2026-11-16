import type { IconName } from "@design-studio/ui";

import type { CanvasToolId } from "../../platform/canvas-tool.js";

type CanvasTool = CanvasToolId | null;

type PresentMode = "window" | "fullscreen" | "new-window" | "play";

interface MenuEntry {
  id: string;
  label: string;
  icon?: IconName;
  meta?: string;
  checked?: boolean;
  disabled?: boolean;
  tip?: string;
  run: () => void;
}

interface MenuGroup {
  label?: string;
  items: MenuEntry[];
  note?: string;
  fold?: "wide" | "narrow" | "tight";
}

export type { CanvasTool, MenuEntry, MenuGroup, PresentMode };
