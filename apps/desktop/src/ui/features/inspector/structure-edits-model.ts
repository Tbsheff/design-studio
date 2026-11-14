import type {
  LayerNode,
  SelectionContext,
  SourceLoc,
  StructureEditRequest,
  StructureKey,
  StructureTarget,
} from "@design-studio/contracts";
import type { IconName } from "@design-studio/ui";

import { STRUCTURE_KEY_IDS } from "../../../shared/structure-keys.js";
import type { PreviewMenuItem } from "./deps.js";

const LOC_RE = /^(?<file>.+):(?<line>\d+):(?<col>\d+)$/u;

const toSourceLoc = (value: string | null): SourceLoc | null => {
  const groups = LOC_RE.exec(value ?? "")?.groups;

  if (!groups?.file) {
    return null;
  }

  return {
    col: Number(groups.col),
    file: groups.file,
    line: Number(groups.line),
  };
};

type SelectionOp = "delete" | "duplicate" | "wrap" | "unwrap" | "group";

type LayerDrop =
  | { readonly into: number }
  | { readonly before: number }
  | { readonly after: number };

const NO_SOURCE =
  "This element has no source location, so it cannot be changed here.";

const toSelectionTargets = (
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

const toRefId = (drop: LayerDrop): number => {
  if ("into" in drop) {
    return drop.into;
  }

  if ("before" in drop) {
    return drop.before;
  }

  return drop.after;
};

const toNodeTarget = (node: LayerNode | null): StructureTarget | null => {
  const source = toSourceLoc(node?.loc ?? null);

  if (node && source) {
    return { source, tag: node.tag };
  }

  return null;
};

const isSameLoc = (first: StructureTarget, second: StructureTarget): boolean =>
  first.source.file === second.source.file &&
  first.source.line === second.source.line &&
  first.source.col === second.source.col;

const toDragTargets = (
  selected: StructureTarget[] | null,
  dragged: StructureTarget
): StructureTarget[] => {
  if (
    selected &&
    selected.length > 1 &&
    selected.some((entry) => isSameLoc(entry, dragged))
  ) {
    return selected;
  }

  return [dragged];
};

const toDropRequest = (
  nodes: LayerNode[],
  id: number,
  drop: LayerDrop,
  selection: SelectionContext[]
): StructureEditRequest | null => {
  const byId = (key: number): StructureTarget | null =>
    toNodeTarget(nodes.find((node) => node.id === key) ?? null);

  const dragged = byId(id);

  const ref = byId(toRefId(drop));

  if (!dragged || !ref) {
    return null;
  }

  const selected = toSelectionTargets(selection);

  const targets = toDragTargets(selected, dragged);

  if ("into" in drop) {
    return { into: ref, op: "move", targets };
  }

  if ("before" in drop) {
    return { before: ref, op: "move", targets };
  }

  return { after: ref, op: "move", targets };
};

interface StructureMenuState {
  readonly count: number;
  readonly hasSource: boolean;
  readonly canPaste: boolean;
  readonly isBusy: boolean;
}

const LABELS: Record<StructureKey, string> = {
  copy: "Copy",
  cut: "Cut to move",
  delete: "Delete",
  duplicate: "Duplicate",
  group: "Group selection",
  paste: "Paste here",
  "paste-replace": "Paste to replace",
  unwrap: "Unwrap",
  wrap: "Wrap in auto layout",
};

const PLAIN_LABEL_KEYS = new Set(["paste", "wrap", "group"]);

const toMenuLabel = (key: StructureKey, count: number): string => {
  if (count > 1 && !PLAIN_LABEL_KEYS.has(key)) {
    return `${LABELS[key]} ${count} layers`;
  }

  return LABELS[key];
};

const ICONS: Record<StructureKey, IconName> = {
  copy: "code",
  cut: "arrowRight",
  delete: "trash",
  duplicate: "copy",
  group: "layers",
  paste: "arrowDown",
  "paste-replace": "restore",
  unwrap: "expand",
  wrap: "frame",
};

const MENU_ORDER: StructureKey[] = [
  "duplicate",
  "group",
  "wrap",
  "unwrap",
  "copy",
  "cut",
  "paste",
  "delete",
];

const toBlockReason = (
  key: StructureKey,
  state: StructureMenuState
): string | null => {
  if (!state.hasSource) {
    return NO_SOURCE;
  }

  if (state.isBusy) {
    return "Wait for the last edit to finish.";
  }

  if (key === "paste" && !state.canPaste) {
    return "Copy or cut a layer first, then select where it goes.";
  }

  return null;
};

const toMenuItem = (
  key: StructureKey,
  index: number,
  context: {
    readonly state: StructureMenuState;
    readonly run: (key: StructureKey) => void;
    readonly hasLeadDivider: boolean;
  }
): PreviewMenuItem => {
  const reason = toBlockReason(key, context.state);

  const item: PreviewMenuItem = {
    divider: (context.hasLeadDivider && index === 0) || key === "delete",
    icon: ICONS[key],
    id: `structure-${key}`,
    keyId: STRUCTURE_KEY_IDS[key],
    label: toMenuLabel(key, context.state.count),
    run: () => context.run(key),
  };

  if (reason) {
    return { ...item, disabled: reason };
  }

  return item;
};

const toStructureMenuEntries = (
  state: StructureMenuState,
  run: (key: StructureKey) => void,
  hasLeadDivider: boolean
): PreviewMenuItem[] =>
  MENU_ORDER.map((key, index) =>
    toMenuItem(key, index, { hasLeadDivider, run, state })
  );

export {
  NO_SOURCE,
  toSelectionTargets,
  toNodeTarget,
  toDropRequest,
  toStructureMenuEntries,
};

export type { SelectionOp, LayerDrop, StructureMenuState };
