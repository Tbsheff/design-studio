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
  fold?: "wide" | "narrow" | "tight";
}

interface SharePoint {
  canExport: boolean;
  onExport: () => void;
  onShip?: (() => void) | null;
  onShareLink?: ((mode?: "link" | "publish") => void) | null;
}

const toExportItem = (point: SharePoint): MenuEntry => {
  const exportItem: MenuEntry = {
    disabled: !point.canExport,
    icon: "download",
    id: "export",
    label: "Export…",
    meta: "PNG, PDF, HTML, handoff",
    run: point.onExport,
  };

  if (!point.canExport) {
    exportItem.tip = "Save a version to export";
  }

  return exportItem;
};

const toShipItems = (ship: (() => void) | null | undefined): MenuEntry[] => {
  if (!ship) {
    return [];
  }

  return [
    {
      icon: "branch",
      id: "ship",
      label: "Ship as a pull request…",
      meta: "Branch and PR",
      run: ship,
    },
  ];
};

const toPublishItems = (point: SharePoint): MenuEntry[] => {
  const link = point.onShareLink;

  if (!link) {
    return [];
  }

  let tip = "Save a version to publish";

  if (point.canExport) {
    tip =
      "Uploads a copy of a saved version to your publish Worker after you confirm";
  }

  return [
    {
      disabled: !point.canExport,
      icon: "globe",
      id: "publish",
      label: "Publish on Cloudflare…",
      meta: "Your publish Worker",
      run: (): void => link("publish"),
      tip,
    },
  ];
};

const shareGroups = (point: SharePoint): MenuGroup[] => [
  {
    items: [
      toExportItem(point),
      ...toShipItems(point.onShip),
      ...toPublishItems(point),
    ],
  },
];

export { shareGroups };

export type { CanvasTool, MenuEntry, MenuGroup, PresentMode };
