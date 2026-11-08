import type { MenuEntry, MenuGroup } from "./top-bar-menu.js";

interface ShareInput {
  readonly canExport: boolean;
  readonly onExport: () => void;
  readonly onShip?: (() => void) | null;
  readonly onShareLink?: ((mode?: "link" | "publish") => void) | null;
}

const SHARE_TIP =
  "Others see still images of the frames and can comment" as const;

const PUBLISH_TIP =
  "Uploads a copy of a saved version to your publish Worker after you confirm" as const;

const toExportItem = (point: ShareInput): MenuEntry => {
  const item: MenuEntry = {
    disabled: !point.canExport,
    icon: "download",
    id: "export",
    label: "Export…",
    meta: "PNG, PDF, HTML, handoff",
    run: point.onExport,
  };

  if (!point.canExport) {
    item.tip = "Save a version to export";
  }

  return item;
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

const toTip = (canExport: boolean, ready: string, blocked: string): string => {
  if (canExport) {
    return ready;
  }

  return blocked;
};

const toLinkItems = (point: ShareInput): MenuEntry[] => {
  const link = point.onShareLink;

  if (!link) {
    return [];
  }

  return [
    {
      disabled: !point.canExport,
      icon: "link",
      id: "share-link",
      label: "Share a read-only link…",
      meta: "View and comment",
      run: () => link("link"),
      tip: toTip(point.canExport, SHARE_TIP, "Save a version to share"),
    },
  ];
};

const toPublishItems = (point: ShareInput): MenuEntry[] => {
  const link = point.onShareLink;

  if (!link) {
    return [];
  }

  return [
    {
      disabled: !point.canExport,
      icon: "globe",
      id: "publish",
      label: "Publish on Cloudflare…",
      meta: "Your publish Worker",
      run: () => link("publish"),
      tip: toTip(point.canExport, PUBLISH_TIP, "Save a version to publish"),
    },
  ];
};

const shareGroups = (
  point: ShareInput,
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
