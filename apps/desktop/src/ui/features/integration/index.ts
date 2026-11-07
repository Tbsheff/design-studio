import { lazy } from "react";

const IntegrationPanel = lazy(async () => {
  const loaded = await import("./integration-panel.js");

  return { default: loaded.IntegrationPanel };
});

export { IntegrationPanel };
