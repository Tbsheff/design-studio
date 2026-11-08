import { lazy } from "react";
import type { LazyExoticComponent } from "react";

import type { CreateTokenDialog as CreateTokenDialogView } from "./create-token-dialog.js";

const CompareView = lazy(async () => {
  const loaded = await import("./compare-view.js");

  return { default: loaded.CompareView };
});

const CreateTokenDialog: LazyExoticComponent<typeof CreateTokenDialogView> =
  lazy(async () => {
    const loaded = await import("./create-token-dialog.js");

    return { default: loaded.CreateTokenDialog };
  });

const LayersPanel = lazy(async () => {
  const loaded = await import("./layers-panel.js");

  return { default: loaded.LayersPanel };
});

const TokensPanel = lazy(async () => {
  const loaded = await import("./tokens-panel.js");

  return { default: loaded.TokensPanel };
});

const VersionsPanel = lazy(async () => {
  const loaded = await import("./versions-panel.js");

  return { default: loaded.VersionsPanel };
});

export {
  CompareView,
  CreateTokenDialog,
  LayersPanel,
  TokensPanel,
  VersionsPanel,
};

export { TokenControl } from "./token-control.js";

export type { CreateTokenSubmit } from "./create-token-dialog.js";
