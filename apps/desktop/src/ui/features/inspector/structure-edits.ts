import type {
  LayerNode,
  SelectionContext,
  StructureEditRequest,
  StructureKey,
  StructureTarget,
} from "@design-studio/contracts";

import { STRUCTURE_KEY_IDS } from "../../../shared/structure-keys.js";
import type { PreviewMenuItem } from "../canvas/preview-menu.js";
import { parseLoc } from "../comments/comment-anchors.js";

type SelectionOp = "delete" | "duplicate" | "wrap" | "unwrap" | "group";

type LayerDrop =
  | { readonly into: number }
  | { readonly before: number }
  | { readonly after: number };

const NO_SOURCE =
  "This element has no source location, so it cannot be changed here.";

const selectionTargets = (
  selection: SelectionContext[]
): StructureTarget[] | null => {
  if (selection.length === 0 || selection.some((entry) => !entry.source)) {
    return null;
  }

  return selection.map((entry) => ({
    selector: entry.selector,
    source: entry.source as NonNullable<SelectionContext["source"]>,
    tag: entry.tag.toLowerCase(),
  }));
};

const nodeTarget = (node: LayerNode | undefined): StructureTarget | null => {
  const source = parseLoc(node?.loc);

  return node && source ? { source, tag: node.tag } : null;
};

const isSameLoc = (first: StructureTarget, second: StructureTarget): boolean =>
  first.source.file === second.source.file &&
  first.source.line === second.source.line &&
  first.source.col === second.source.col;

const dropRequest = (
  nodes: LayerNode[],
  id: number,
  drop: LayerDrop,
  selection: SelectionContext[]
): StructureEditRequest | null => {
  const byId = (key: number): StructureTarget | null =>
    nodeTarget(nodes.find((node) => node.id === key));

  const dragged = byId(id);

  const refId =
    "into" in drop ? drop.into : "before" in drop ? drop.before : drop.after;

  const ref = byId(refId);

  if (!dragged || !ref) {
    return null;
  }

  const selected = selectionTargets(selection);

  const targets =
    selected &&
    selected.length > 1 &&
    selected.some((entry) => isSameLoc(entry, dragged))
      ? selected
      : [dragged];

  if ("into" in drop) {
    return { into: ref, op: "move", targets };
  }

  return "before" in drop
    ? { before: ref, op: "move", targets }
    : { after: ref, op: "move", targets };
};

interface StructureMenuState {
  readonly count: number;
  readonly hasSource: boolean;
  readonly canPaste: boolean;
  readonly isBusy: boolean;
}

const LABELS: Record<StructureKey, string> = {
  cut: "Cut to move",
  delete: "Delete",
  duplicate: "Duplicate",
  group: "Group selection",
  paste: "Move cut layers here",
  unwrap: "Unwrap",
  wrap: "Wrap in auto layout",
};

const ICONS: Record<StructureKey, PreviewMenuItem["icon"]> = {
  cut: "arrowRight",
  delete: "trash",
  duplicate: "copy",
  group: "layers",
  paste: "arrowDown",
  unwrap: "expand",
  wrap: "frame",
};

const MENU_ORDER: StructureKey[] = [
  "duplicate",
  "group",
  "wrap",
  "unwrap",
  "cut",
  "paste",
  "delete",
];

const blockReason = (
  key: StructureKey,
  state: StructureMenuState
): string | undefined => {
  if (!state.hasSource) {
    return NO_SOURCE;
  }

  if (state.isBusy) {
    return "Wait for the last edit to finish.";
  }

  if (key === "paste" && !state.canPaste) {
    return "Cut a layer first, then select where it goes.";
  }

  return undefined;
};

const structureMenuItems = (
  state: StructureMenuState,
  run: (key: StructureKey) => void,
  leadDivider = false
): PreviewMenuItem[] =>
  MENU_ORDER.map((key, index) => {
    const disabled = blockReason(key, state);

    const label =
      state.count > 1 && key !== "paste" && key !== "wrap" && key !== "group"
        ? `${LABELS[key]} ${state.count} layers`
        : LABELS[key];

    return {
      divider: (leadDivider && index === 0) || key === "delete",
      icon: ICONS[key],
      id: `structure-${key}`,
      keyId: STRUCTURE_KEY_IDS[key],
      label,
      run: () => run(key),
      ...(disabled ? { disabled } : {}),
    };
  });

export {
  NO_SOURCE,
  selectionTargets,
  nodeTarget,
  dropRequest,
  structureMenuItems,
};

export type { SelectionOp, LayerDrop, StructureMenuState };
