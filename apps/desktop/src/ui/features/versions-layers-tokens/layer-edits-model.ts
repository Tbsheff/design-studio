import type {
  DirectEditRequest,
  SelectionContext,
  SourceLoc,
} from "@design-studio/contracts";

import type { ParentMessageBody } from "../../platform/bridge.js";
import type { LayerChange } from "./layer-edits-types.js";
import type { LayerTree } from "./layers-tree.js";

const toLocKey = (loc: SourceLoc): string =>
  `${loc.file}:${loc.line}:${loc.col}`;

const toDisplay = (isHidden: boolean): "none" | null => {
  if (isHidden) {
    return "none";
  }

  return null;
};

const toDirectEditRequest = (
  target: SelectionContext,
  source: SourceLoc,
  change: LayerChange
): DirectEditRequest => {
  const { selector } = target;
  const tag = target.tag.toLowerCase();
  const base = { selector, source, tag };

  if ("move" in change) {
    return { ...base, move: change.move };
  }

  if ("name" in change) {
    return { ...base, name: change.name };
  }

  return { ...base, style: { display: toDisplay(change.hidden) } };
};

const withOverrides = (
  tree: LayerTree | null,
  names: ReadonlyMap<number, string>,
  hidden: ReadonlyMap<number, boolean>
): LayerTree | null => {
  if (!tree || (names.size === 0 && hidden.size === 0)) {
    return tree;
  }

  const nodes = tree.nodes.map((node) => {
    if (!names.has(node.id) && !hidden.has(node.id)) {
      return node;
    }

    return {
      ...node,
      hidden: hidden.get(node.id) ?? node.hidden,
      name: names.get(node.id) ?? node.name,
    };
  });

  return { ...tree, nodes };
};

const toPreviewStyle = (
  selector: string,
  isHidden: boolean
): ParentMessageBody => ({
  selector,
  style: { display: toDisplay(isHidden) },
  type: "preview-style",
});

const toCutNotice = (count: number, pasteKey: string): string => {
  let what = `${count} layers`;
  let pronoun = "them";

  if (count === 1) {
    what = "1 layer";
    pronoun = "it";
  }

  return `Cut ${what}. Select a frame and press ${pasteKey} to move ${pronoun} there.`;
};

export {
  toCutNotice,
  toDirectEditRequest,
  toDisplay,
  toPreviewStyle,
  toLocKey,
  withOverrides,
};
