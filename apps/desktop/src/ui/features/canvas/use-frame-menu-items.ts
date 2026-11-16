import { useMemo } from "react";

import type { CanvasFrame } from "./canvas-frames-model.js";
import { copy } from "./copy.js";
import type { FrameMenuEntry } from "./frame-menu-groups-model.js";
import { useMenu } from "./frame-menu-model.js";
import type { FrameMenu } from "./frame-menu-model.js";
import { pageName } from "./page-name-model.js";
import { useFramePin } from "./use-frame-pin.js";
import { useFrameShareLink } from "./use-frame-share-link.js";
import { useStateBoard } from "./use-state-board.js";

interface FrameMenuItems {
  readonly isPinned: boolean;
  readonly items: FrameMenuEntry[];
  readonly pageMenu: FrameMenu;
}

const toMenuItems = (
  items: readonly FrameMenuEntry[],
  extras: readonly (FrameMenuEntry | null)[]
): FrameMenuEntry[] => [
  ...items,
  ...extras.filter((item): item is FrameMenuEntry => item !== null),
];

const useFrameMenuItems = (
  projectId: string,
  frame: Pick<CanvasFrame, "id" | "path">,
  own: readonly FrameMenuEntry[]
): FrameMenuItems => {
  const frameId = frame.id;
  const path = frame.path ?? "";
  const pin = useFramePin(projectId, frameId);
  const board = useStateBoard(projectId, frameId);
  const shareLink = useFrameShareLink(projectId, frameId);
  const pageMenu = useMenu();
  const { setOpen } = pageMenu;

  const page = useMemo(
    (): FrameMenuEntry => ({
      icon: "file",
      id: "page",
      label: `${copy.framePageItem}${pageName(path)}${copy.framePageItemEnd}`,
      run: () => setOpen(true),
    }),
    [path, setOpen]
  );

  const items = useMemo(
    () => toMenuItems([page, ...own], [board, pin.item, shareLink]),
    [page, own, board, pin.item, shareLink]
  );

  return { isPinned: pin.isPinned, items, pageMenu };
};

export { useFrameMenuItems };
