import { useCallback, useMemo } from "react";

import { setFramePath } from "./canvas-frame-ops.js";
import { copy } from "./copy.js";
import type { GetLive } from "./frame-label-state.js";
import type { FrameMenuEntry } from "./frame-menu-groups-model.js";
import { useMenu } from "./frame-menu-model.js";
import type { FrameMenu } from "./frame-menu-model.js";

interface FramePageItem {
  readonly item: FrameMenuEntry;
  readonly menu: FrameMenu;
  readonly handlePath: (path: string) => void;
}

const useFramePageItem = (getLive: GetLive, frameId: string): FramePageItem => {
  const menu = useMenu();
  const { setOpen } = menu;

  const item = useMemo(
    (): FrameMenuEntry => ({
      icon: "file",
      id: "frame-page",
      label: copy.framePageItem,
      run: () => setOpen(true),
    }),
    [setOpen]
  );

  const handlePath = useCallback(
    (path: string): void =>
      getLive().frames.update((canvasLayout) =>
        setFramePath(canvasLayout, frameId, path)
      ),
    [getLive, frameId]
  );

  return { handlePath, item, menu };
};

export { useFramePageItem };

export type { FramePageItem };
