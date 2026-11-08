import type { LayerNode, StructureKey } from "@design-studio/contracts";

import { OPEN_DEPTH, OVERSCAN, ROW } from "./layers-constants.js";
import { ancestorsOf } from "./layers-tree.js";

interface OpenState {
  collapsed: Set<string>;
  known: Set<string>;
  scrollTop: number;
}

const openStates = new Map<string, OpenState>();
const listeners = new Set<() => void>();

const subscribeOpenState = (listener: () => void): (() => void) => {
  listeners.add(listener);

  return (): void => {
    listeners.delete(listener);
  };
};

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

  if (isChanged) {
    state.collapsed = new Set(state.collapsed);
  }

  return isChanged;
};

const revealNode = (
  nodes: LayerNode[],
  keys: Map<number, string>,
  state: OpenState,
  selectedNode: number | null
): void => {
  if (selectedNode === null) {
    return;
  }

  const hidden = ancestorsOf(nodes, selectedNode).filter((id) =>
    state.collapsed.has(keys.get(id) ?? "")
  );

  if (hidden.length === 0) {
    return;
  }

  const next = new Set(state.collapsed);

  for (const id of hidden) {
    next.delete(keys.get(id) ?? "");
  }

  state.collapsed = next;
};

const toggleCollapsed = (
  state: OpenState,
  key: string,
  open: boolean | null
): void => {
  const next = new Set(state.collapsed);
  const shouldOpen = open ?? next.has(key);

  if (shouldOpen) {
    next.delete(key);
  } else {
    next.add(key);
  }

  state.collapsed = next;

  for (const listener of listeners) {
    listener();
  }
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
  revealNode,
  saveScrollTop,
  subscribeOpenState,
  toCollapsedIds,
  toggleCollapsed,
  toLayersScope,
  toOpenState,
  toRowWindow,
  toRunTool,
  toSelectedIndex,
};

export type { OpenState, RowWindow };
