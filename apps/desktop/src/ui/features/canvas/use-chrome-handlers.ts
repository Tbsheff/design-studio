import { useCallback, useState } from "react";

import { uiStore } from "../../platform/storage.js";
import { useFileMenu } from "./canvas-chrome-menu.js";
import type { ChromeProps, FileMenu } from "./canvas-chrome-menu.js";
import { reloadFrames } from "./canvas-shell.js";
import { runTool } from "./chrome-model.js";
import type { CanvasTool, InlinePresent, PresentMode } from "./chrome-model.js";

interface ChromeHandlers {
  readonly closeImport: () => void;
  readonly closePresent: () => void;
  readonly file: FileMenu;
  readonly isImporting: boolean;
  readonly onPresent: (mode: PresentMode) => void;
  readonly onTool: (next: Exclude<CanvasTool, null>) => void;
  readonly present: InlinePresent | null;
  readonly reload: () => void;
  readonly toggleView: () => void;
}

const useChromeHandlers = (chrome: ChromeProps): ChromeHandlers => {
  const [present, setPresent] = useState<InlinePresent | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const openImport = useCallback(() => setIsImporting(true), []);
  const closeImport = useCallback(() => setIsImporting(false), []);
  const closePresent = useCallback(() => setPresent(null), []);
  const file = useFileMenu(chrome, openImport);
  const { presentUrl, proto, stage } = chrome;

  const onTool = useCallback(
    (next: Exclude<CanvasTool, null>) => runTool(chrome, next),
    [chrome]
  );

  const onPresent = useCallback(
    (mode: PresentMode): void => {
      if (mode === "play") {
        proto.play();

        return;
      }

      if (!presentUrl) {
        return;
      }

      if (mode === "new-window") {
        globalThis.open(presentUrl, "_blank", "noopener");
      } else {
        setPresent(mode);
      }
    },
    [proto, presentUrl]
  );

  const reload = useCallback(() => reloadFrames(stage()), [stage]);

  const toggleView = useCallback(
    () => uiStore.set((st) => ({ viewRowOpen: !st.viewRowOpen })),
    []
  );

  return {
    closeImport,
    closePresent,
    file,
    isImporting,
    onPresent,
    onTool,
    present,
    reload,
    toggleView,
  };
};

export { useChromeHandlers };

export type { ChromeHandlers };
