import type { LayerNode } from "@design-studio/contracts";

import { dropTarget, siblingRow, subtreeEnd } from "./layers-tree.js";
import type { DropTarget } from "./layers-tree.js";

const CONTAINER_TAGS = new Set([
  "div",
  "section",
  "main",
  "article",
  "aside",
  "header",
  "footer",
  "nav",
  "form",
  "ul",
  "ol",
  "li",
  "figure",
  "body",
]);

const EDGE_ZONE = 0.25;
const HALF_ROW = 0.5;

interface LayerDropTarget {
  drop: { into: number } | { before: number } | { after: number };
  line: number | null;
  into: number | null;
}

const edgeDrop = (
  rows: LayerNode[],
  index: number,
  isAfter: boolean,
  rowHeight: number
): LayerDropTarget => {
  const row = rows[index] as LayerNode;
  const next = rows[index + 1];

  if (!isAfter) {
    return { drop: { before: row.id }, into: null, line: index * rowHeight };
  }

  if (next && next.depth > row.depth) {
    return {
      drop: { before: next.id },
      into: null,
      line: (index + 1) * rowHeight,
    };
  }

  return { drop: { after: row.id }, into: null, line: (index + 1) * rowHeight };
};

const layerDrop = (
  rows: LayerNode[],
  id: number,
  offsetY: number,
  rowHeight: number
): LayerDropTarget | null => {
  const from = rows.findIndex((item) => item.id === id);
  const index = Math.floor(offsetY / rowHeight);
  const row = rows[index];

  if (
    from === -1 ||
    !row ||
    (index >= from && index < subtreeEnd(rows, from))
  ) {
    return null;
  }

  const frac = offsetY / rowHeight - index;

  const canHold =
    row.childCount > 0 || (CONTAINER_TAGS.has(row.tag) && row.text === "");

  if (canHold && frac > EDGE_ZONE && frac < 1 - EDGE_ZONE) {
    return { drop: { into: row.id }, into: row.id, line: null };
  }

  return edgeDrop(rows, index, frac >= HALF_ROW, rowHeight);
};

const adjacentMove = (
  rows: LayerNode[],
  id: number,
  offsetY: number,
  rowHeight: number
): DropTarget | null => {
  const from = rows.findIndex((item) => item.id === id);
  const index = Math.floor(offsetY / rowHeight);
  let prev: number | null = null;
  let next: number | null = null;

  if (from !== -1) {
    prev = siblingRow(rows, from, -1);
    next = siblingRow(rows, from, 1);
  }

  const onPrev = prev !== null && index >= prev && index < from;

  const onNext =
    next !== null && index >= next && index < subtreeEnd(rows, next);

  if (onPrev || onNext) {
    return dropTarget(rows, id, offsetY, rowHeight);
  }

  return null;
};

export { adjacentMove, layerDrop };

export type { LayerDropTarget };
