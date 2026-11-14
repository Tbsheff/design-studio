import type { LayerNode } from "@design-studio/contracts";
import { useMemo, useRef } from "react";
import type { PointerEvent, RefObject } from "react";

import type { DragHandlers } from "./layer-drag-model.js";
import type { LayerRowCallbacks } from "./layer-row-callbacks-model.js";
import { toShownNodes } from "./layer-row-model.js";
import { toLayersScope } from "./layers-open-state-model.js";
import type { LayerTree } from "./layers-tree.js";
import { useLatest } from "./use-latest.js";
import { useLayerCollapse } from "./use-layer-collapse.js";
import type { CollapsedApi } from "./use-layer-collapse.js";
import { useLayerKeys } from "./use-layer-keys.js";
import type { LayerKeyEdits } from "./use-layer-keys.js";
import { useLayerListState } from "./use-layer-list-state.js";
import type { LayerListState } from "./use-layer-list-state.js";
import { useLayerRename } from "./use-layer-rename.js";
import type { LayerRenameApi } from "./use-layer-rename.js";
import { useLayerRowCallbacks } from "./use-layer-row-callbacks.js";
import { useLayerSearch } from "./use-layer-search.js";
import type { LayerSearchApi } from "./use-layer-search.js";
import { usePendingSelect } from "./use-pending-select.js";
import { useRowMenu } from "./use-row-menu.js";
import type { RowMenuApi } from "./use-row-menu.js";

interface PanelEdits extends LayerKeyEdits {
  readonly menuItems?: unknown;
  readonly onDrop?: NonNullable<DragHandlers["onDrop"]>;
  readonly onMove: NonNullable<DragHandlers["onMove"]>;
  readonly onRename: (id: number, name: string | null) => void;
}

interface PanelStateInput {
  readonly confirmed: number | null;
  readonly confirmedNodes: ReadonlySet<number>;
  readonly edits: PanelEdits | null;
  readonly frameName: string;
  readonly isMac: boolean;
  readonly onEscape: () => void;
  readonly onHover: (id: number | null) => void;
  readonly onSelect: (id: number, isAdditive: boolean) => void;
  readonly onToggleLocked: ((id: number, locked: boolean) => void) | undefined;
  readonly tree: LayerTree | null;
}

interface PanelTree extends Omit<CollapsedApi, "collapsed"> {
  readonly collapsed: ReadonlySet<number>;
  readonly dimmed: ReadonlySet<number>;
  readonly search: LayerSearchApi;
  readonly nodes: LayerNode[];
  readonly rows: LayerNode[];
  readonly scope: string;
  readonly select: (id: number, isAdditive: boolean) => void;
  readonly selectedNode: number | null;
  readonly selectedNodes: ReadonlySet<number>;
}

interface PointerHandlers {
  readonly handlePointerCancel: () => void;
  readonly handlePointerMove: (event: PointerEvent<HTMLDivElement>) => void;
  readonly handlePointerUp: () => void;
  readonly handleScroll: LayerListState["onScroll"];
}

interface PanelState extends PointerHandlers {
  readonly callbacks: LayerRowCallbacks;
  readonly collapsed: ReadonlySet<number>;
  readonly dimmed: ReadonlySet<number>;
  readonly keys: Map<number, string>;
  readonly list: LayerListState;
  readonly listRef: RefObject<HTMLDivElement | null>;
  readonly onKeyDown: ReturnType<typeof useLayerKeys>;
  readonly rename: LayerRenameApi;
  readonly rowMenu: RowMenuApi;
  readonly rows: LayerNode[];
  readonly rowsRef: RefObject<HTMLDivElement | null>;
  readonly search: LayerSearchApi;
  readonly selectedNode: number | null;
  readonly selectedNodes: ReadonlySet<number>;
}

const toPointerHandlers = (list: LayerListState): PointerHandlers => ({
  handlePointerCancel: list.drag.onPointerCancel,
  handlePointerMove: list.drag.onPointerMove,
  handlePointerUp: list.drag.onPointerUp,
  handleScroll: list.onScroll,
});

const usePanelTree = (input: PanelStateInput): PanelTree => {
  const { confirmed, frameName, tree } = input;
  const nodes = useMemo(() => tree?.nodes ?? [], [tree]);
  const latestSelect = useLatest(input.onSelect);
  const pending = usePendingSelect(confirmed, latestSelect);
  const { select, shown: selectedNode } = pending;
  const { confirmedNodes } = input;

  const selectedNodes = useMemo(
    () => toShownNodes(confirmedNodes, pending.pending, selectedNode),
    [confirmedNodes, pending.pending, selectedNode]
  );

  const scope = toLayersScope(frameName);
  const collapse = useLayerCollapse(nodes, selectedNode, scope);
  const { collapsed } = collapse;

  const search = useLayerSearch({
    collapsed,
    nodes,
    onEscape: input.onEscape,
    onSelect: select,
  });

  const { dimmed, rows, shown } = search.view;

  return {
    ...collapse,
    collapsed: shown,
    dimmed,
    nodes,
    rows,
    scope,
    search,
    select,
    selectedNode,
    selectedNodes,
  };
};

const usePanelState = (input: PanelStateInput): PanelState => {
  const { edits, isMac, onHover, onToggleLocked } = input;
  const treeState = usePanelTree(input);
  const { collapsed, dimmed, keys, nodes, rows, scope, search } = treeState;
  const { dismiss: onEscape, focus: onFind } = search;
  const { select, selectedNode, selectedNodes, toggle } = treeState;
  const listRef = useRef<HTMLDivElement>(null);
  const rowsRef = useRef<HTMLDivElement>(null);
  const onDrop = edits?.onDrop ?? null;
  const onMove = edits?.onMove ?? null;

  const list = useLayerListState({
    handlers: { onDrop, onMove },
    listRef,
    rows,
    rowsRef,
    scope,
    selectedNode,
  });

  const onRename = edits?.onRename ?? null;
  const onSelect = select;
  const rename = useLayerRename({ keys, listRef, onRename, onSelect, rows });
  const rowMenu = useRowMenu(Boolean(edits?.menuItems), selectedNodes, select);
  const { selectedIndex } = list;
  const { setEditing: onStartEdit } = rename;

  const onKeyDown = useLayerKeys({
    collapsed,
    edits,
    isMac,
    nodes,
    onEscape,
    onFind,
    onSelect,
    onStartEdit,
    onToggleLocked,
    rows,
    selectedIndex,
    selectedNode,
    toggle,
  });

  const { open: onMenu } = rowMenu;
  const { onPress } = list.drag;
  const { finishRename: onRenameDone, setEditing: onSetEditing } = rename;
  const onToggle = toggle;
  const onToggleHidden = edits?.onToggleHidden ?? null;

  const callbacks = useLayerRowCallbacks({
    onHover,
    onMenu,
    onPress,
    onRenameDone,
    onSelect,
    onSetEditing,
    onToggle,
    onToggleHidden,
    onToggleLocked,
  });

  return {
    ...toPointerHandlers(list),
    callbacks,
    collapsed,
    dimmed,
    keys,
    list,
    listRef,
    onKeyDown,
    rename,
    rowMenu,
    rows,
    rowsRef,
    search,
    selectedNode,
    selectedNodes,
  };
};

export { usePanelState };

export type { PanelEdits, PanelState };
