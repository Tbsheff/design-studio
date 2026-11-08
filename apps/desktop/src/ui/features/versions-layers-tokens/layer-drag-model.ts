import type { LayerNode, ReorderMove } from "@design-studio/contracts";

import { ROW } from "./layers-constants.js";
import { adjacentMove, layerDrop } from "./layers-drop.js";
import type { LayerDropTarget } from "./layers-drop.js";
import { dropTarget } from "./layers-tree.js";

interface RowDrop {
  readonly commit: () => void;
  readonly into: number | null;
  readonly line: number | null;
}

interface DragHandlers {
  readonly onDrop: ((id: number, drop: LayerDropTarget["drop"]) => void) | null;
  readonly onMove: ((id: number, move: ReorderMove) => void) | null;
}

const toFinder = (onDrop: DragHandlers["onDrop"]): typeof dropTarget => {
  if (onDrop) {
    return adjacentMove;
  }

  return dropTarget;
};

const toRowDrop = (
  rows: LayerNode[],
  id: number,
  offset: number,
  handlers: DragHandlers
): RowDrop | null => {
  const { onDrop, onMove } = handlers;
  let target: LayerDropTarget | null = null;

  if (onDrop) {
    target = layerDrop(rows, id, offset, ROW);
  }

  if (onDrop && target !== null && target.into !== null) {
    const { drop, into } = target;
    const line = null;

    return { commit: () => onDrop(id, drop), into, line };
  }

  if (onMove) {
    const find = toFinder(onDrop);
    const swap = find(rows, id, offset, ROW);

    if (swap) {
      const into = null;
      const { line } = swap;

      return { commit: () => onMove(id, swap.move), into, line };
    }
  }

  if (target && onDrop) {
    const { drop, line } = target;
    const into = null;

    return { commit: () => onDrop(id, drop), into, line };
  }

  return null;
};

export { toRowDrop };

export type { DragHandlers, RowDrop };
