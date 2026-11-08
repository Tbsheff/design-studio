import { LAYER_LABEL_MAX, LAYER_TREE_MAX } from "@design-studio/contracts";
import type { LayerNode, ReorderMove } from "@design-studio/contracts";

import {
  isFieldSource,
  isList,
  isNumber,
  isText,
} from "../../platform/json-guard.js";

const LOC_MAX = 1100;
const TAG_MAX = 32;

interface LayerTree {
  nodes: LayerNode[];
  truncated: boolean;
}

interface RawLayerTree {
  nodes?: unknown;
  truncated?: unknown;
}

type Fields = ReadonlyMap<string, unknown>;

const toText = (fields: Fields, key: string, max: number): string => {
  const value = fields.get(key);

  if (isText(value)) {
    return value.slice(0, max);
  }

  return "";
};

const toCount = (fields: Fields, key: string): number => {
  const value = fields.get(key);

  if (isNumber(value) && Number.isInteger(value) && value >= 0) {
    return value;
  }

  return 0;
};

const toOptionalFields = (
  fields: Fields
): Pick<LayerNode, "loc" | "locked"> => {
  const optional: Pick<LayerNode, "loc" | "locked"> = {};
  const loc = fields.get("loc");

  if (isText(loc) && loc.length <= LOC_MAX) {
    optional.loc = loc;
  }

  if (fields.get("locked") === true) {
    optional.locked = true;
  }

  return optional;
};

const toLayerNode = (
  fields: Fields,
  previousDepth: number
): LayerNode | null => {
  const id = fields.get("id");

  if (!isNumber(id) || !Number.isInteger(id)) {
    return null;
  }

  return {
    childCount: toCount(fields, "childCount"),
    depth: Math.min(toCount(fields, "depth"), previousDepth + 1),
    hidden: fields.get("hidden") === true,
    id,
    name: toText(fields, "name", LAYER_LABEL_MAX),
    tag: toText(fields, "tag", TAG_MAX).replaceAll(/[^a-z0-9-]/giu, ""),
    text: toText(fields, "text", LAYER_LABEL_MAX),
    ...toOptionalFields(fields),
  };
};

const parseLayerTree = (raw: RawLayerTree): LayerTree => {
  let list: unknown[] = [];

  if (isList(raw.nodes)) {
    list = raw.nodes.slice(0, LAYER_TREE_MAX);
  }

  const nodes: LayerNode[] = [];

  for (const item of list.filter((entry) => isFieldSource(entry))) {
    const node = toLayerNode(
      new Map(Object.entries(item)),
      nodes.at(-1)?.depth ?? -1
    );

    if (node) {
      nodes.push(node);
    }
  }

  return { nodes, truncated: raw.truncated === true };
};

const visibleRows = (
  nodes: LayerNode[],
  collapsed: ReadonlySet<number>
): LayerNode[] => {
  const rows: LayerNode[] = [];
  let skipBelow = Infinity;

  for (const node of nodes) {
    if (node.depth <= skipBelow) {
      skipBelow = Infinity;
      rows.push(node);

      if (node.childCount > 0 && collapsed.has(node.id)) {
        skipBelow = node.depth;
      }
    }
  }

  return rows;
};

const layerKeys = (nodes: LayerNode[]): Map<number, string> => {
  const keys = new Map<number, string>();

  const stack: { key: string; counts: Map<string, number> }[] = [
    { counts: new Map(), key: "" },
  ];

  for (const node of nodes) {
    stack.length = Math.min(stack.length, node.depth + 1);

    const parent = stack.at(-1) as {
      key: string;
      counts: Map<string, number>;
    };

    const index = parent.counts.get(node.tag) ?? 0;
    parent.counts.set(node.tag, index + 1);
    const key = `${parent.key}/${node.tag}${index}`;
    keys.set(node.id, key);
    stack.push({ counts: new Map(), key });
  }

  return keys;
};

const ancestorsOf = (nodes: LayerNode[], id: number): number[] => {
  const index = nodes.findIndex((node) => node.id === id);

  if (index === -1) {
    return [];
  }

  const out: number[] = [];
  let { depth } = nodes[index] as LayerNode;

  for (let at = index - 1; at >= 0 && depth > 0; at -= 1) {
    const node = nodes[at] as LayerNode;

    if (node.depth < depth) {
      out.push(node.id);
      ({ depth } = node);
    }
  }

  return out;
};

const parentOf = (nodes: LayerNode[], id: number): number | null =>
  ancestorsOf(nodes, id)[0] ?? null;

const defaultCollapsed = (
  nodes: LayerNode[],
  openDepth: number
): Set<number> => {
  const collapsed = new Set<number>();

  for (const node of nodes) {
    if (node.childCount > 0 && node.depth >= openDepth) {
      collapsed.add(node.id);
    }
  }

  return collapsed;
};

type TreeAction = { select: number } | { toggle: number; open: boolean } | null;

const firstChildOf = (nodes: LayerNode[], node: LayerNode): number | null => {
  if (node.childCount === 0) {
    return null;
  }

  return nodes[nodes.indexOf(node) + 1]?.id ?? null;
};

const stepAction = (
  rows: LayerNode[],
  index: number,
  step: 1 | -1
): TreeAction => {
  let [target] = rows;

  if (index >= 0) {
    target = rows[index + step];
  }

  if (!target) {
    return null;
  }

  return { select: target.id };
};

const expandAction = (
  nodes: LayerNode[],
  node: LayerNode,
  collapsed: ReadonlySet<number>,
  open: boolean
): TreeAction => {
  if (open) {
    if (node.childCount === 0) {
      return null;
    }

    if (collapsed.has(node.id)) {
      return { open: true, toggle: node.id };
    }

    const child = firstChildOf(nodes, node);

    if (child === null) {
      return null;
    }

    return { select: child };
  }

  if (node.childCount > 0 && !collapsed.has(node.id)) {
    return { open: false, toggle: node.id };
  }

  const parent = parentOf(nodes, node.id);

  if (parent === null) {
    return null;
  }

  return { select: parent };
};

interface TreeKeyInput {
  readonly collapsed: ReadonlySet<number>;
  readonly nodes: LayerNode[];
  readonly rows: LayerNode[];
  readonly selected: number | null;
}

const treeKeyAction = (
  key: string,
  shift: boolean,
  input: TreeKeyInput
): TreeAction => {
  const { collapsed, nodes, rows, selected } = input;
  let index = -1;

  if (selected !== null) {
    index = rows.findIndex((row) => row.id === selected);
  }

  if (key === "ArrowDown") {
    return stepAction(rows, index, 1);
  }

  if (key === "ArrowUp") {
    return stepAction(rows, index, -1);
  }

  const node = rows[index];

  if (index < 0 || !node) {
    return null;
  }

  if (key === "ArrowRight") {
    return expandAction(nodes, node, collapsed, true);
  }

  if (key === "ArrowLeft") {
    return expandAction(nodes, node, collapsed, false);
  }

  if (key !== "Enter") {
    return null;
  }

  let target = firstChildOf(nodes, node);

  if (shift) {
    target = parentOf(nodes, node.id);
  }

  if (target === null) {
    return null;
  }

  return { select: target };
};

const subtreeEnd = (rows: LayerNode[], index: number): number => {
  const depth = rows[index]?.depth ?? 0;
  let end = index + 1;

  while (end < rows.length && (rows[end] as LayerNode).depth > depth) {
    end += 1;
  }

  return end;
};

const siblingRow = (
  rows: LayerNode[],
  index: number,
  step: 1 | -1
): number | null => {
  const origin = rows[index];

  if (!origin) {
    return null;
  }

  const { depth } = origin;

  for (let at = index + step; at >= 0 && at < rows.length; at += step) {
    const row = rows[at] as LayerNode;

    if (row.depth < depth) {
      return null;
    }

    if (row.depth === depth) {
      return at;
    }
  }

  return null;
};

interface DropTarget {
  move: ReorderMove;
  line: number;
}

const dropTarget = (
  rows: LayerNode[],
  id: number,
  offsetY: number,
  rowHeight: number
): DropTarget | null => {
  const index = rows.findIndex((row) => row.id === id);

  if (index === -1) {
    return null;
  }

  if (offsetY < index * rowHeight) {
    const prev = siblingRow(rows, index, -1);

    if (prev === null) {
      return null;
    }

    return { line: prev * rowHeight, move: "up" };
  }

  if (offsetY < subtreeEnd(rows, index) * rowHeight) {
    return null;
  }

  const next = siblingRow(rows, index, 1);

  if (next === null) {
    return null;
  }

  return { line: subtreeEnd(rows, next) * rowHeight, move: "down" };
};

const FALLBACK_LABEL = /^[#.]/u;
const UNSAFE_NAME_CHARS = "\"'`<>{}&\\";
const LAST_CONTROL_CODE = 0x1f;
const DELETE_CODE = 0x7f;

const isUnsafeNameChar = (char: string): boolean => {
  const code = char.codePointAt(0) ?? 0;

  return (
    code <= LAST_CONTROL_CODE ||
    code === DELETE_CODE ||
    UNSAFE_NAME_CHARS.includes(char)
  );
};

const editableName = (name: string): string => {
  if (FALLBACK_LABEL.test(name)) {
    return "";
  }

  return name;
};

const cleanName = (value: string): string =>
  [...value]
    .filter((char) => !isUnsafeNameChar(char))
    .join("")
    .slice(0, LAYER_LABEL_MAX);

export {
  parseLayerTree,
  visibleRows,
  layerKeys,
  ancestorsOf,
  parentOf,
  defaultCollapsed,
  treeKeyAction,
  subtreeEnd,
  siblingRow,
  dropTarget,
  editableName,
  cleanName,
};

export type { LayerTree, TreeAction, DropTarget };
