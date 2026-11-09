import type { LayerNode } from "@design-studio/contracts";

import { INDENT_BASE, INDENT_STEP } from "./layers-constants.js";

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

const toRowText = (node: LayerNode): string =>
  [node.tag, node.name, node.text].filter(Boolean).join(" ");

const toAriaExpanded = (
  node: LayerNode,
  isCollapsed: boolean
): boolean | undefined => {
  if (node.childCount > 0) {
    return !isCollapsed;
  }
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
  toRowText,
};
