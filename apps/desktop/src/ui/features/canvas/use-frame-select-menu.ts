import type { IconName } from "@design-studio/ui";
import { useCallback, useMemo } from "react";

import { TIDY_FRAMES_EVENT } from "../../domain/tidy-frames-events.js";
import type { TidyFramesDetail } from "../../domain/tidy-frames-events.js";
import { copy } from "./copy.js";
import {
  FRAME_ALIGN_TOOLS,
  FRAME_SPREAD_TOOLS,
  isFrameAlignReady,
} from "./frame-align-model.js";
import type { FrameAlignLayout, FrameAlignTool } from "./frame-align-model.js";
import type {
  FrameMenuEntry,
  FrameMenuRow,
} from "./frame-menu-groups-model.js";
import { useMenu } from "./frame-menu-model.js";
import { clearFrameSelection } from "./frame-selection-store.js";
import { useFrameAlign } from "./use-frame-align.js";

interface FrameSelectMenu {
  readonly menu: ReturnType<typeof useMenu>;
  readonly rows: readonly FrameMenuRow[];
  readonly toggle: () => void;
}

const ALIGN_ICONS = new Map<string, IconName>([
  ["bottom", "selfEnd"],
  ["center", "alignCenter"],
  ["left", "alignLeft"],
  ["middle", "selfCenter"],
  ["right", "alignRight"],
  ["spread-x", "expand"],
  ["spread-y", "expand"],
  ["top", "selfStart"],
]);

const toAlignIcon = (tool: FrameAlignTool): IconName =>
  ALIGN_ICONS.get(tool.layout ?? "left") ?? "alignLeft";

const toAlignEntry = (
  tool: FrameAlignTool,
  count: number,
  onAlign: (layout: FrameAlignLayout) => void
): FrameMenuEntry => {
  const entry = {
    icon: toAlignIcon(tool),
    id: `align-${tool.layout}`,
    label: tool.label,
    run: (): void => onAlign(tool.layout),
  };

  if (isFrameAlignReady(tool.layout, count)) {
    return entry;
  }

  return { ...entry, disabled: copy.frameSelectSpreadNeeds };
};

const tidySelected = (): void => {
  const detail: TidyFramesDetail = { frameId: null, layout: "tidy" };

  globalThis.dispatchEvent(new CustomEvent(TIDY_FRAMES_EVENT, { detail }));
};

const useFrameSelectMenu = (
  ids: readonly string[],
  removeFramesAt: (ids: readonly string[]) => void
): FrameSelectMenu => {
  const menu = useMenu();
  const { setOpen } = menu;
  const onAlign = useFrameAlign();
  const count = ids.length;
  const toggle = useCallback(() => setOpen((value) => !value), [setOpen]);

  const removeSelected = useCallback((): void => {
    clearFrameSelection();
    removeFramesAt(ids);
  }, [ids, removeFramesAt]);

  const rows = useMemo(
    (): readonly FrameMenuRow[] => [
      {
        entries: FRAME_ALIGN_TOOLS.map((tool) =>
          toAlignEntry(tool, count, onAlign)
        ),
        group: { icon: "alignLeft", id: "align", label: copy.frameSelectAlign },
        kind: "group",
      },
      {
        entries: FRAME_SPREAD_TOOLS.map((tool) =>
          toAlignEntry(tool, count, onAlign)
        ),
        group: { icon: "expand", id: "spread", label: copy.frameSelectSpread },
        kind: "group",
      },
      {
        entry: {
          icon: "frame",
          id: "tidy-frames",
          label: copy.frameSelectTidy,
          run: tidySelected,
        },
        kind: "item",
      },
      {
        entry: {
          icon: "trash",
          id: "remove-frames",
          label: `${copy.frameSelectRemove}${count}${copy.frameSelectCount}`,
          run: removeSelected,
        },
        kind: "item",
      },
    ],
    [count, onAlign, removeSelected]
  );

  return { menu, rows, toggle };
};

export { useFrameSelectMenu };

export type { FrameSelectMenu };
