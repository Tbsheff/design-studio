import type {
  LayerNode,
  ReorderMove,
  StructureKey,
} from "@design-studio/contracts";
import { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { MouseEvent, ReactNode } from "react";

import { PreviewMenu } from "../canvas/preview-menu.js";
import type { PreviewMenuItem } from "../canvas/preview-menu.js";
import { focusStageQuietly } from "../canvas/use-inline-text-edit.js";
import { IS_MAC, tipWithKey } from "../commands/index.js";
import type { LayerDrop } from "../inspector/index.js";
import { COPY } from "./copy.js";
import { LayersHeader } from "./layers-header.js";
import { LayersList } from "./layers-list.js";
import {
  applyDefaultCollapse,
  toCollapsedIds,
  toLayersScope,
  toOpenState,
  toRunTool,
} from "./layers-open-state-model.js";
import { LayersRows } from "./layers-rows.js";
import { ancestorsOf, layerKeys, visibleRows } from "./layers-tree.js";
import type { LayerTree } from "./layers-tree.js";
import { useLatest } from "./use-latest.js";
import { useLayerKeys } from "./use-layer-keys.js";
import { useLayerListState } from "./use-layer-list-state.js";
import { useLayerRename } from "./use-layer-rename.js";
import { useLayerRowCallbacks } from "./use-layer-row-callbacks.js";
import { usePendingSelect } from "./use-pending-select.js";

interface LayerEditActions {
  onRename: (id: number, name: string | null) => void;
  onToggleHidden: (id: number, hidden: boolean) => void;
  onMove: (id: number, move: ReorderMove) => void;
  onMoveSelected: (move: ReorderMove) => void;
  onStructureKey?: (key: StructureKey) => void;
  onDrop?: (id: number, drop: LayerDrop) => void;
  menuItems?: () => PreviewMenuItem[];
}

interface LayersPanelProps {
  tree: LayerTree | null;
  frameName: string;
  selectedNode: number | null;
  onHover: (id: number | null) => void;
  onSelect: (id: number, additive: boolean) => void;
  onClose?: () => void;
  edits?: LayerEditActions | null;
  onToggleLocked?: (id: number, locked: boolean) => void;
  busy?: boolean;
  hoveredNode?: number | null;
}

interface CollapsedApi {
  collapsed: Set<number>;
  keys: Map<number, string>;
  toggle: (id: number, open?: boolean) => void;
}

interface RowMenuApi {
  menu: ReactNode;
  open: (node: LayerNode, event: MouseEvent<HTMLDivElement>) => void;
}

const useCollapsed = (
  nodes: LayerNode[],
  selectedNode: number | null,
  scope: string
): CollapsedApi => {
  const keys = useMemo(() => layerKeys(nodes), [nodes]);
  const state = toOpenState(scope);
  const [version, setVersion] = useState(0);
  const bump = useCallback(() => setVersion((current) => current + 1), []);

  if (applyDefaultCollapse(nodes, keys, state)) {
    state.collapsed = new Set(state.collapsed);
  }

  const collapsed = useMemo(
    () => toCollapsedIds(nodes, keys, state.collapsed),
    [nodes, keys, state.collapsed, version]
  );

  useLayoutEffect(() => {
    if (selectedNode === null) {
      return;
    }

    const open = ancestorsOf(nodes, selectedNode).filter((id) =>
      collapsed.has(id)
    );

    if (open.length === 0) {
      return;
    }

    const next = new Set(state.collapsed);

    for (const id of open) {
      next.delete(keys.get(id) ?? "");
    }

    state.collapsed = next;
    bump();
  }, [nodes, keys, selectedNode, collapsed, state, bump]);

  const toggle = useCallback(
    (id: number, open?: boolean): void => {
      const key = keys.get(id);

      if (key === undefined) {
        return;
      }

      const next = new Set(state.collapsed);
      const shouldOpen = open ?? next.has(key);

      if (shouldOpen) {
        next.delete(key);
      } else {
        next.add(key);
      }

      state.collapsed = next;
      bump();
    },
    [keys, state, bump]
  );

  return { collapsed, keys, toggle };
};

const useRowMenu = (
  edits: LayerEditActions | null,
  selectedNode: number | null,
  onSelect: (id: number, additive: boolean) => void
): RowMenuApi => {
  const [at, setAt] = useState<{ x: number; y: number } | null>(null);

  const open = (node: LayerNode, event: MouseEvent<HTMLDivElement>): void => {
    if (!edits?.menuItems) {
      return;
    }

    if (node.id !== selectedNode) {
      onSelect(node.id, false);
    }

    setAt({ x: event.clientX, y: event.clientY });
  };

  const close = (): void => setAt(null);
  let menu: ReactNode = null;

  if (at && edits?.menuItems) {
    menu = (
      <PreviewMenu
        at={at}
        label={COPY.labelLayerActions}
        items={edits.menuItems()}
        onClose={close}
      />
    );
  }

  return { menu, open };
};

const LayersPanel = ({
  tree,
  frameName,
  selectedNode: confirmed,
  onHover,
  onSelect: onSelectProp,
  onClose,
  edits: editsProp,
  onToggleLocked,
  busy = false,
  hoveredNode = null,
}: LayersPanelProps): ReactNode => {
  const nodes = useMemo(() => tree?.nodes ?? [], [tree]);
  const latestSelect = useLatest(onSelectProp);

  const { shown: selectedNode, select: onSelect } = usePendingSelect(
    confirmed,
    latestSelect
  );

  const scope = toLayersScope(frameName);
  const { collapsed, toggle, keys } = useCollapsed(nodes, selectedNode, scope);
  const rows = useMemo(() => visibleRows(nodes, collapsed), [nodes, collapsed]);
  const listRef = useRef<HTMLDivElement>(null);
  const rowsRef = useRef<HTMLDivElement>(null);
  const editActions = editsProp ?? null;

  const onDrop = editActions?.onDrop ?? null;
  const onMove = editActions?.onMove ?? null;

  const { drag, onScroll, rowWindow, selectedIndex } = useLayerListState({
    handlers: { onDrop, onMove },
    listRef,
    rows,
    rowsRef,
    scope,
    selectedNode,
  });

  const onRename = editActions?.onRename ?? null;
  const rename = useLayerRename({ keys, listRef, onRename, onSelect, rows });
  const rowMenu = useRowMenu(editActions, selectedNode, onSelect);

  const isMac = IS_MAC;
  const onEscape = focusStageQuietly;
  const { setEditing: onStartEdit } = rename;
  const edits = editActions;

  const onKeyDown = useLayerKeys({
    collapsed,
    edits,
    isMac,
    nodes,
    onEscape,
    onSelect,
    onStartEdit,
    onToggleLocked,
    rows,
    selectedIndex,
    selectedNode,
    toggle,
  });

  const { open: onMenu } = rowMenu;
  const onToggle = toggle;
  const onToggleHidden = editActions?.onToggleHidden ?? null;

  const { onPress } = drag;
  const { finishRename: onRenameDone, setEditing: onSetEditing } = rename;

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

  return (
    <aside className="layers" aria-label={COPY.labelLayers}>
      <LayersHeader
        frameName={frameName}
        isBusy={busy}
        onClose={onClose ?? null}
        onRunTool={toRunTool(selectedNode, editActions)}
        toTip={tipWithKey}
      />
      <LayersList
        ref={listRef}
        isBusy={busy}
        isDragging={drag.dragging !== null}
        rowCount={rows.length}
        selectedIndex={selectedIndex}
        selectedNode={selectedNode}
        tree={tree}
        onKeyDown={onKeyDown}
        onPointerCancel={drag.onPointerCancel}
        onPointerMove={drag.onPointerMove}
        onPointerUp={drag.onPointerUp}
        onScroll={onScroll}
      >
        <LayersRows
          ref={rowsRef}
          callbacks={callbacks}
          collapsed={collapsed}
          dropInto={drag.drop?.into ?? null}
          dropLine={drag.drop?.line ?? null}
          editingKey={rename.editingKey}
          first={rowWindow.first}
          hoveredNode={hoveredNode}
          isEditable={editActions !== null}
          keys={keys}
          last={rowWindow.last}
          rows={rows}
          selectedNode={selectedNode}
        />
      </LayersList>
      {rowMenu.menu}
    </aside>
  );
};

export { LayersPanel };

export type { LayerEditActions, LayersPanelProps };
