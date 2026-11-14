import type {
  SelectionContext,
  SelectionStack,
  StackPeer,
} from "@design-studio/contracts";

import { rectOf, selectionFor, selectorFor, sourceOf } from "./element-info.js";

const MAX_PEERS = 8;
const MAX_SCAN = 400;
const MIN_OVERLAP = 0.5;

const STACK_DISPLAYS: ReadonlySet<string> = new Set([
  "flex",
  "grid",
  "inline-flex",
  "inline-grid",
]);

type Box = StackPeer["rect"];

const isOverlap = (one: Box, two: Box): boolean => {
  const width =
    Math.min(one.x + one.width, two.x + two.width) - Math.max(one.x, two.x);

  const height =
    Math.min(one.y + one.height, two.y + two.height) - Math.max(one.y, two.y);

  return width > MIN_OVERLAP && height > MIN_OVERLAP;
};

const isLayerMaker = (computed: CSSStyleDeclaration): boolean =>
  Number(computed.opacity) < 1 ||
  computed.transform !== "none" ||
  computed.filter !== "none";

const toZ = (computed: CSSStyleDeclaration): number | null => {
  const value = Math.trunc(Number(computed.zIndex));

  if (Number.isNaN(value)) {
    return null;
  }

  return value;
};

const toPeer = (
  element: Element,
  domIndex: number,
  isStackItem: boolean
): StackPeer => {
  const computed = globalThis.getComputedStyle(element);

  return {
    domIndex,
    isStackItem,
    makesLayer: isLayerMaker(computed),
    position: computed.position,
    rect: rectOf(element),
    selector: selectorFor(element),
    source: sourceOf(element),
    tag: element.tagName.toLowerCase(),
    z: toZ(computed),
  };
};

const isShown = (box: Box): boolean => box.width > 0 && box.height > 0;

const toSelectionStack = (element: Element): SelectionStack | null => {
  const parent = element.parentElement;

  if (parent === null) {
    return null;
  }

  const isStackItem = STACK_DISPLAYS.has(
    globalThis.getComputedStyle(parent).display
  );

  const siblings = [...parent.children].slice(0, MAX_SCAN);
  const self = toPeer(element, siblings.indexOf(element), isStackItem);
  const peers: StackPeer[] = [];

  for (const [index, sibling] of siblings.entries()) {
    if (peers.length >= MAX_PEERS) {
      break;
    }

    const box = rectOf(sibling);

    if (sibling !== element && isShown(box) && isOverlap(self.rect, box)) {
      peers.push(toPeer(sibling, index, isStackItem));
    }
  }

  return { peers, self };
};

const toAnchorContext = (
  element: Element,
  hasStack: boolean
): SelectionContext => {
  const context = selectionFor(element);

  if (hasStack) {
    context.stack = toSelectionStack(element);
  }

  return context;
};

export { toAnchorContext };
