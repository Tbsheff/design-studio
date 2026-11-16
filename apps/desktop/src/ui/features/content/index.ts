import { lazy } from "react";

const ContentMount = lazy(async () => {
  const loaded = await import("./content-mount.js");

  return { default: loaded.ContentMount };
});

export { useContentHost } from "./use-content-host.js";

export { ContentMount };

export type { ContentHost } from "./use-content-host.js";
