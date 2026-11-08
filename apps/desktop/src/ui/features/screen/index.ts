import { lazy } from "react";

const ScreenDialog = lazy(async () => {
  const loaded = await import("./screen-dialog.js");

  return { default: loaded.ScreenDialog };
});

const ScreenDuplicateDialog = lazy(async () => {
  const loaded = await import("./screen-duplicate-dialog.js");

  return { default: loaded.ScreenDuplicateDialog };
});

export { ScreenDialog, ScreenDuplicateDialog };

export type { ScreenDialogProps } from "./screen-dialog.js";

export type { ScreenDuplicateDialogProps } from "./screen-duplicate-dialog.js";
