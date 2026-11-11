import { lazy } from "react";

const PrototypeBar = lazy(async () => {
  const loaded = await import("./prototype-bar.js");

  return { default: loaded.PrototypeBar };
});

export { PrototypeBar };
