import { lazy } from "react";

const ExportDialog = lazy(async () => {
  const loaded = await import("./export-dialog.js");

  return { default: loaded.ExportDialog };
});

const ShareDialog = lazy(async () => {
  const loaded = await import("./share-dialog.js");

  return { default: loaded.ShareDialog };
});

const ShipDialog = lazy(async () => {
  const loaded = await import("./ship-dialog.js");

  return { default: loaded.ShipDialog };
});

export { ExportDialog, ShareDialog, ShipDialog };
