import { lazy } from "react";

const PrototypeDialog = lazy(async () => {
  const loaded = await import("./prototype-dialog.js");

  return { default: loaded.PrototypeDialog };
});

export { PrototypeDialog };
