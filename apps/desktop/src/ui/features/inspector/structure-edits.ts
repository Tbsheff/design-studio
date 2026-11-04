import type {
  LayerNode,
  SelectionContext,
  StructureEditRequest,
  StructureKey,
  StructureTarget,
} from "@design-studio/actions/_core/contracts";
import { STRUCTURE_KEY_IDS } from "../../../shared/structure-keys.js";
import type { PreviewMenuItem } from "../canvas/preview-menu.js";
import { parseLoc } from "../comments/comment-anchors.js";

export type SelectionOp = "delete" | "duplicate" | "wrap" | "unwrap" | "group";

export type LayerDrop =
  | { into: number }
  | { before: number }
  | { after: number };

export const NO_SOURCE =
  "This element has no source location, so it cannot be changed here.";

export const selectionTargets = (
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

export const nodeTarget = (
  node: LayerNode | undefined
): StructureTarget | null => {
  const source = parseLoc(node?.loc);

  return node && source ? { source, tag: node.tag } : null;
};

const sameLoc = (a: StructureTarget, b: StructureTarget): boolean =>
  a.source.file === b.source.file &&
  a.source.line === b.source.line &&
  a.source.col === b.source.col;

export const dropRequest = (
  nodes: LayerNode[],
  id: number,
  drop: LayerDrop,
  selection: SelectionContext[]
): StructureEditRequest | null => {
  const byId = (key: number) =>
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
    selected.some((entry) => sameLoc(entry, dragged))
      ? selected
      : [dragged];

  if ("into" in drop) {
    return { into: ref, op: "move", targets };
  }

  return "before" in drop
    ? { before: ref, op: "move", targets }
    : { after: ref, op: "move", targets };
};

export interface StructureMenuState {
  count: number;
  hasSource: boolean;
  canPaste: boolean;
  busy: boolean;
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

  if (state.busy) {
    return "Wait for the last edit to finish.";
  }

  if (key === "paste" && !state.canPaste) {
    return "Cut a layer first, then select where it goes.";
  }

  return undefined;
};

export const structureMenuItems = (
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
