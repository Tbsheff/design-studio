import type { LayerNode } from "@design-studio/contracts";
import type { MouseEvent, PointerEvent } from "react";

interface LayerRowCallbacks {
  readonly handleHover: (id: number | null) => void;
  readonly handleMenu: (
    node: LayerNode,
    event: MouseEvent<HTMLDivElement>
  ) => void;
  readonly handlePress: (
    id: number,
    event: PointerEvent<HTMLDivElement>
  ) => void;
  readonly handleRenameDone: (
    node: LayerNode,
    value: string | null,
    next?: 1 | -1
  ) => void;
  readonly handleSelect: (id: number, isAdditive: boolean) => void;
  readonly handleStartRename: (id: number) => void;
  readonly handleToggle: (id: number) => void;
  readonly handleToggleHidden: (node: LayerNode) => void;
  readonly handleToggleLocked: ((node: LayerNode) => void) | null;
}

export type { LayerRowCallbacks };
