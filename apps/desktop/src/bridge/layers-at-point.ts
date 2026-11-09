import type { LayerPick } from "@design-studio/contracts";

import type { BridgeContext, MessageHandlers } from "./bridge-types.js";
import { componentOwners } from "./component-owner.js";
import { isNumber, isString } from "./dom-input.js";
import { rectOf, selectorFor, shortLabel } from "./element-info.js";
import { isLayer } from "./layers.js";

const LAYERS_AT_MAX = 12;
const TEXT_NAME_MAX = 32;
const STUDIO_OVERLAY = '[id^="studio-"]';

const toTextName = (element: Element): string => {
  if (element.children.length > 0) {
    return "";
  }

  const flat = (element.textContent ?? "").replaceAll(/\s+/gu, " ").trim();

  if (flat.length > TEXT_NAME_MAX) {
    return `${flat.slice(0, TEXT_NAME_MAX - 1)}…`;
  }

  return flat;
};

const toOwnerName = (element: Element): string => {
  const own = componentOwners(element)[0]?.name ?? "";
  const parent = element.parentElement;

  if (!own || !parent) {
    return own;
  }

  if (componentOwners(parent)[0]?.name === own) {
    return "";
  }

  return own;
};

const toDataName = (element: Element): string => {
  if (element instanceof HTMLElement || element instanceof SVGElement) {
    return element.dataset.name ?? "";
  }

  return "";
};

const toLayerName = (element: Element): string => {
  const named = toOwnerName(element) || toDataName(element);

  return named || toTextName(element) || shortLabel(element);
};

const isStudioOwned = (element: Element): boolean =>
  !isLayer(element) || element.closest(STUDIO_OVERLAY) !== null;

const isPickable = (
  element: Element,
  isLocked: (element: Element) => boolean
): boolean =>
  element !== document.documentElement &&
  element !== document.body &&
  !isStudioOwned(element) &&
  !isLocked(element);

const toStack = (x: number, y: number): Element[] => {
  const stack = new Set<Element>();

  for (const hit of document.elementsFromPoint(x, y)) {
    let current: Element | null = hit;

    while (current && current !== document.body) {
      stack.add(current);
      current = current.parentElement;
    }
  }

  return [...stack];
};

const toLayerPicks = (
  x: number,
  y: number,
  context: BridgeContext
): LayerPick[] => {
  const { layers, locks } = context;

  return toStack(x, y)
    .filter((element) => isPickable(element, locks.isLocked))
    .slice(0, LAYERS_AT_MAX)
    .map((element) => ({
      box: rectOf(element),
      id: layers.idOf(element),
      name: toLayerName(element),
      selector: selectorFor(element),
      tag: element.tagName.toLowerCase(),
    }));
};

const createLayersAtPointHandler = (
  context: BridgeContext
): Pick<MessageHandlers, "layers-at-point"> => ({
  "layers-at-point": (message) => {
    if (
      !isString(message.requestId) ||
      !isNumber(message.x) ||
      !isNumber(message.y)
    ) {
      return;
    }

    context.post({
      layers: toLayerPicks(message.x, message.y, context),
      requestId: message.requestId,
      type: "layers-at",
    });
  },
});

export { createLayersAtPointHandler };
