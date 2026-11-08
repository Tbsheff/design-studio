import { lazy } from "react";

const DataModelDialog = lazy(async () => {
  const loaded = await import("./data-model-dialog.js");

  return { default: loaded.DataModelDialog };
});

export { DataModelDialog };
