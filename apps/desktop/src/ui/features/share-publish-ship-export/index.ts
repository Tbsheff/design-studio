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

const PublishPane = lazy(async () => {
  const loaded = await import("./publish-pane.js");

  return { default: loaded.PublishPane };
});

const PublishSetup = lazy(async () => {
  const loaded = await import("./publish-setup.js");

  return { default: loaded.PublishSetup };
});

export { ExportDialog, PublishPane, PublishSetup, ShareDialog, ShipDialog };

export { exportApi } from "./export-api.js";
