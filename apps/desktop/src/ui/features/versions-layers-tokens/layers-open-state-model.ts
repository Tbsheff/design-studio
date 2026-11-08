import type { LayerNode, StructureKey } from "@design-studio/contracts";

import { OPEN_DEPTH, OVERSCAN, ROW } from "./layers-constants.js";

interface OpenState {
  collapsed: Set<string>;
  known: Set<string>;
  scrollTop: number;
}

const openStates = new Map<string, OpenState>();

const toOpenState = (scope: string): OpenState => {
  const existing = openStates.get(scope);

  if (existing) {
    return existing;
  }

  const created: OpenState = {
    collapsed: new Set(),
    known: new Set(),
    scrollTop: 0,
  };

  openStates.set(scope, created);

  return created;
};

const saveScrollTop = (scope: string, top: number): void => {
  toOpenState(scope).scrollTop = top;
};

const toCollapsedIds = (
  nodes: LayerNode[],
  keys: Map<number, string>,
  collapsed: ReadonlySet<string>
): Set<number> => {
  const out = new Set<number>();

  for (const node of nodes) {
    if (keys.has(node.id) && collapsed.has(keys.get(node.id) ?? "")) {
      out.add(node.id);
    }
  }

  return out;
};

const applyDefaultCollapse = (
  nodes: LayerNode[],
  keys: Map<number, string>,
  state: OpenState
): boolean => {
  let isChanged = false;

  for (const node of nodes) {
    const key = keys.get(node.id) ?? "";

    if (keys.has(node.id) && !state.known.has(key)) {
      state.known.add(key);

      if (node.childCount > 0 && node.depth >= OPEN_DEPTH) {
        state.collapsed.add(key);
        isChanged = true;
      }
    }
  }

  return isChanged;
};

const toLayersScope = (frameName: string): string => {
  let path = "";

  if (typeof location !== "undefined") {
    path = location.pathname;
  }

  return `${path}|${frameName}`;
};


interface RowWindow {
  readonly first: number;
  readonly last: number;
}

const toSelectedIndex = (
  rows: LayerNode[],
  selectedNode: number | null
): number => {
  if (selectedNode === null) {
    return -1;
  }

  return rows.findIndex((row) => row.id === selectedNode);
};

const toRowWindow = (
  scroll: { readonly height: number; readonly top: number },
  rowCount: number
): RowWindow => {
  const first = Math.max(0, Math.floor(scroll.top / ROW) - OVERSCAN);

  const last = Math.min(
    rowCount,
    Math.ceil((scroll.top + scroll.height) / ROW) + OVERSCAN
  );

  return { first, last };
};

const toRunTool = (
  selectedNode: number | null,
  edits: { readonly onStructureKey?: (key: StructureKey) => void } | null
): ((key: StructureKey) => void) | null => {
  if (selectedNode === null) {
    return null;
  }

  return edits?.onStructureKey ?? null;
};

export {
  applyDefaultCollapse,
  saveScrollTop,
  toCollapsedIds,
  toLayersScope,
  toOpenState,
  toRowWindow,
  toRunTool,
  toSelectedIndex,
};

export type { OpenState, RowWindow };
