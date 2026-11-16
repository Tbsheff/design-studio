import type { LayerNode } from "@design-studio/contracts";

import { LAYER_ROLE_COPY } from "./copy.js";
import { INDENT_BASE, INDENT_STEP } from "./layers-constants.js";
import { editableName } from "./layers-tree.js";

const BUTTON_NAME = /btn|button|cta/iu;

interface LayerRowFlags {
  readonly dimmed: boolean;
  readonly dropInto: boolean;
  readonly hovered: boolean;
  readonly node: LayerNode;
  readonly selected: boolean;
}

const toRowClass = (flags: LayerRowFlags): string => {
  const { dimmed, dropInto, hovered, node, selected } = flags;
  const names = ["layers-row"];

  if (selected) {
    names.push("selected");
  }

  if (hovered) {
    names.push("hovered");
  }

  if (node.hidden) {
    names.push("is-hidden");
  }

  if (node.locked) {
    names.push("is-locked");
  }

  if (dimmed) {
    names.push("is-dimmed");
  }

  if (dropInto) {
    names.push("drop-into");
  }

  return names.join(" ");
};

const toRowIndent = (depth: number): number =>
  INDENT_BASE + depth * INDENT_STEP;

const toRowText = (node: LayerNode): string => {
  if (editableName(node.name)) {
    return node.tag;
  }

  return `${node.tag}${node.name}`;
};

const toLayerRole = (node: LayerNode): string => {
  if (node.tag === "a" && BUTTON_NAME.test(node.name)) {
    return LAYER_ROLE_COPY.get("button") ?? node.tag;
  }

  return (
    LAYER_ROLE_COPY.get(node.tag) ?? LAYER_ROLE_COPY.get("frame") ?? node.tag
  );
};

const toLayerTitle = (node: LayerNode): string =>
  editableName(node.name) || toLayerRole(node);

const toAriaExpanded = (
  node: LayerNode,
  isCollapsed: boolean
): boolean | undefined => {
  if (node.childCount > 0) {
    return !isCollapsed;
  }
};

const toShownNodes = (
  confirmed: ReadonlySet<number>,
  pending: number | null,
  shown: number | null
): ReadonlySet<number> => {
  if (pending !== null) {
    return new Set([pending]);
  }

  if (shown === null || confirmed.has(shown)) {
    return confirmed;
  }

  return new Set([...confirmed, shown]);
};

const toActiveDescendant = (
  selectedIndex: number,
  selectedNode: number | null
): string | undefined => {
  if (selectedIndex >= 0) {
    return `layer-${selectedNode}`;
  }
};

const toListClass = (isDragging: boolean): string => {
  if (isDragging) {
    return "layers-list dragging";
  }

  return "layers-list";
};

export {
  toActiveDescendant,
  toListClass,
  toAriaExpanded,
  toRowClass,
  toRowIndent,
  toLayerTitle,
  toRowText,
  toShownNodes,
};
