import { lazy } from "react";

const ImpactDialog = lazy(async () => {
  const loaded = await import("./impact-dialog.js");

  return { default: loaded.ImpactDialog };
});

export { ImpactDialog };

export type { ImpactDialogProps } from "./impact-dialog.js";
