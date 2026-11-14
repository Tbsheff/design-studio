import { SOURCE_LOC_ATTR } from "@design-studio/contracts";
import type { SourceLoc } from "@design-studio/contracts";

import { sourceOf } from "./element-info.js";

interface RangeTarget {
  readonly element: HTMLElement;
  readonly source: SourceLoc | null;
  readonly tag: string;
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

const toTagOf = (element: Element): string => element.tagName.toLowerCase();

const toStyledTag = (
  head: HTMLElement,
  range: Range,
  tags: ReadonlySet<string>
): string => {
  let current: Node | null = range.commonAncestorContainer;

  while (current !== null && current !== head) {
    if (current instanceof Element && tags.has(toTagOf(current))) {
      return toTagOf(current);
    }

    current = current.parentNode;
  }

  return toTagOf(head);
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
      tags.has(toTagOf(current)) &&
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
  const fallback = { element: layer, source: null, tag: toTagOf(layer) };

  if (head !== tail || head === layer || !(head instanceof HTMLElement)) {
    return fallback;
  }

  if (!head.hasAttribute(SOURCE_LOC_ATTR)) {
    return { ...fallback, tag: toStyledTag(head, range, tags) };
  }

  const element = toStyledInside(head, range, tags);
  const source = sourceOf(element);

  if (source === null) {
    return fallback;
  }

  return { element, source, tag: toTagOf(element) };
};

export { toRangeTarget };

export type { RangeTarget };
