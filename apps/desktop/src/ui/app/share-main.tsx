import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { toMountRoot } from "../platform/focus";
import { pick } from "../platform/pick";
import { ShareViewerApp } from "./share-viewer-app";

const DARK_QUERY = "(prefers-color-scheme: dark)";

const applyTheme = (): void => {
  const isDark = globalThis.matchMedia(DARK_QUERY).matches;

  globalThis.document.documentElement.dataset.theme = pick(
    isDark,
    "dark",
    "light"
  );
};

applyTheme();

globalThis.matchMedia(DARK_QUERY).addEventListener("change", applyTheme);

const root = toMountRoot();

if (root) {
  createRoot(root).render(
    <StrictMode>
      <ShareViewerApp />
    </StrictMode>
  );
}
