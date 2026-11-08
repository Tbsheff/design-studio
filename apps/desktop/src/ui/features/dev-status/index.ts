import { lazy } from "react";

const DevStatusDialog = lazy(async () => {
  const loaded = await import("./dev-status-dialog.js");

  return { default: loaded.DevStatusDialog };
});

export { DevStatusDialog };

export type { DevStatusDialogProps } from "./dev-status-dialog.js";
