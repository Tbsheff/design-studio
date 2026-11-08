import type { ReorderMove, StructureKey } from "@design-studio/contracts";
import type { ReactNode } from "react";

import { PreviewMenu } from "../canvas/preview-menu.js";
import type { PreviewMenuItem } from "../canvas/preview-menu.js";
import { focusStageQuietly } from "../canvas/use-inline-text-edit.js";
import { IS_MAC, tipWithKey } from "../commands/index.js";
import type { LayerDrop } from "../inspector/index.js";
import { COPY } from "./copy.js";
import { LayersHeader } from "./layers-header.js";
import { LayersList } from "./layers-list.js";
import { toRunTool } from "./layers-open-state-model.js";
import { LayersRows } from "./layers-rows.js";
import type { LayerTree } from "./layers-tree.js";
import { usePanelState } from "./use-layers-panel-state.js";
import type { RowMenuApi } from "./use-row-menu.js";

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

const toMenu = (
  rowMenu: RowMenuApi,
  edits: LayerEditActions | null
): ReactNode => {
  const { at, close: handleClose } = rowMenu;

  if (!at || !edits?.menuItems) {
    return null;
  }

  return (
    <PreviewMenu
      at={at}
      label={COPY.labelLayerActions}
      items={edits.menuItems()}
      onClose={handleClose}
    />
  );
};

const LayersPanel = ({
  tree,
  frameName,
  selectedNode: confirmed,
  onHover,
  onSelect,
  onClose,
  edits: editsProp,
  onToggleLocked,
  busy = false,
  hoveredNode = null,
}: LayersPanelProps): ReactNode => {
  const edits = editsProp ?? null;
  const isMac = IS_MAC;
  const onEscape = focusStageQuietly;

  const state = usePanelState({
    confirmed,
    edits,
    frameName,
    isMac,
    onEscape,
    onHover,
    onSelect,
    onToggleLocked,
    tree,
  });

  const { list, rename, rowMenu, selectedNode } = state;
  const { drag } = list;
  const { listRef, onKeyDown, rowsRef } = state;

  return (
    <aside className="layers" aria-label={COPY.labelLayers}>
      <LayersHeader
        frameName={frameName}
        isBusy={busy}
        onClose={onClose ?? null}
        onRunTool={toRunTool(selectedNode, edits)}
        toTip={tipWithKey}
      />
      <LayersList
        ref={listRef}
        isBusy={busy}
        isDragging={drag.dragging !== null}
        rowCount={state.rows.length}
        selectedIndex={list.selectedIndex}
        selectedNode={selectedNode}
        tree={tree}
        onKeyDown={onKeyDown}
        onPointerCancel={state.handlePointerCancel}
        onPointerMove={state.handlePointerMove}
        onPointerUp={state.handlePointerUp}
        onScroll={state.handleScroll}
      >
        <LayersRows
          ref={rowsRef}
          callbacks={state.callbacks}
          collapsed={state.collapsed}
          dropInto={drag.drop?.into ?? null}
          dropLine={drag.drop?.line ?? null}
          editingKey={rename.editingKey}
          first={list.rowWindow.first}
          hoveredNode={hoveredNode}
          isEditable={edits !== null}
          keys={state.keys}
          last={list.rowWindow.last}
          rows={state.rows}
          selectedNode={selectedNode}
        />
      </LayersList>
      {toMenu(rowMenu, edits)}
    </aside>
  );
};

export { LayersPanel };

export type { LayerEditActions, LayersPanelProps };
