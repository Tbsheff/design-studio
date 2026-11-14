import { SOURCE_LOC_ATTR } from "@design-studio/contracts";
import type { SourceLoc } from "@design-studio/contracts";

import { sourceOf } from "./element-info.js";

interface RangeTarget {
  readonly element: HTMLElement;
  readonly source: SourceLoc | null;
}

const toOwnerOf = (layer: HTMLElement, node: Node): Node | null => {
  let current: Node | null = node;

  while (current !== null && current.parentNode !== layer) {
    if (current === layer) {
      return layer;
    }

    current = current.parentNode;
  }

  if (current instanceof HTMLElement) {
    return current;
  }

  return layer;
};

const toRangeTarget = (layer: HTMLElement, range: Range): RangeTarget => {
  const head = toOwnerOf(layer, range.startContainer);
  const tail = toOwnerOf(layer, range.endContainer);
  const fallback = { element: layer, source: null };

  if (
    head !== tail ||
    head === layer ||
    !(head instanceof HTMLElement) ||
    !head.hasAttribute(SOURCE_LOC_ATTR)
  ) {
    return fallback;
  }

  const source = sourceOf(head);

  if (source === null) {
    return fallback;
  }

  return { element: head, source };
};

export { toRangeTarget };

export type { RangeTarget };
