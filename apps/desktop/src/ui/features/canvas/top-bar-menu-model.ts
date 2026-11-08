import type { IconName } from "@design-studio/ui";

type CanvasTool = "select" | "comment" | "edit" | "prototype" | null;

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

const toPortItems = (onPort: (() => void) | null): MenuEntry[] => {
  if (!onPort) {
    return [];
  }

  return [
    {
      icon: "react",
      id: "port",
      label: "Move to app…",
      meta: "Route in your app",
      run: onPort,
      tip: "The agent rebuilds a page as a route in an attached app, with its kit components",
    },
  ];
};

const toLinkItems = (point: SharePoint): MenuEntry[] => {
  const link = point.onShareLink;

  if (!link) {
    return [];
  }

  let tip = "Save a version to share";

  if (point.canExport) {
    tip = "Others see still images of the frames and can comment";
  }

  return [
    {
      disabled: !point.canExport,
      icon: "link",
      id: "share-link",
      label: "Share a read-only link…",
      meta: "View and comment",
      run: (): void => link("link"),
      tip,
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

const shareGroups = (
  point: SharePoint,
  onPort: (() => void) | null
): MenuGroup[] => [
  {
    items: [
      toExportItem(point),
      ...toShipItems(point.onShip),
      ...toPortItems(onPort),
    ],
  },
  {
    items: toLinkItems(point),
    note: "Links are off until you make one. Nothing leaves this computer.",
  },
  {
    items: toPublishItems(point),
    note: "Publish uploads only after you confirm what goes public.",
  },
];

export { shareGroups };

export type { CanvasTool, MenuEntry, MenuGroup, PresentMode };
