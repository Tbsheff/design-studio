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

const toStyledInside = (
  head: HTMLElement,
  range: Range,
  tags: ReadonlySet<string>
): HTMLElement => {
  let current: Node | null = range.commonAncestorContainer;

  while (current !== null && current !== head) {
    if (
      current instanceof HTMLElement &&
      tags.has(current.tagName.toLowerCase()) &&
      current.hasAttribute(SOURCE_LOC_ATTR)
    ) {
      return current;
    }

    current = current.parentNode;
  }

  return head;
};

const toRangeTarget = (
  layer: HTMLElement,
  range: Range,
  tags: ReadonlySet<string>
): RangeTarget => {
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

  const element = toStyledInside(head, range, tags);
  const source = sourceOf(element);

  if (source === null) {
    return fallback;
  }

  return { element, source };
};

export { toRangeTarget };

export type { RangeTarget };
