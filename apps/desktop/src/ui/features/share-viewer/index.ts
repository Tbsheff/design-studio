import { lazy } from "react";

const ShareViewer = lazy(async () => {
  const loaded = await import("./share-viewer.js");

  return { default: loaded.ShareViewer };
});

export { ShareViewer };

export type { SharePlayInput, ViewerFrame } from "./share-viewer-model.js";
