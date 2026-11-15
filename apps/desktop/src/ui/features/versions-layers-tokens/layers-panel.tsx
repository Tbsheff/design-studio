import type { ReorderMove, StructureKey } from "@design-studio/contracts";
import type { ReactNode } from "react";

import { tipWithKey } from "../../platform/key-tip.js";
import { PreviewMenu } from "../canvas/preview-menu.js";
import type { PreviewMenuItem } from "../canvas/preview-menu.js";
import { focusStageQuietly } from "../canvas/use-inline-text-edit.js";
import { IS_MAC } from "../commands/index.js";
import type { LayerDrop } from "../inspector/index.js";
import { COPY } from "./copy.js";
import { LayerSearchField } from "./layer-search-field.js";
import { LayersHeader } from "./layers-header.js";
import { LayersList } from "./layers-list.js";
import { toRunTool } from "./layers-open-state-model.js";
import { LayersRows } from "./layers-rows.js";
import type { LayerTree } from "./layers-tree.js";
import { RenameManyPopup } from "./rename-many-popup.js";
import { usePanelState } from "./use-layers-panel-state.js";
import type { RenameMany, RenameManyApi } from "./use-rename-many.js";
import type { RowMenuApi } from "./use-row-menu.js";

import styles from "./rename-many.module.css";

interface LayerEditActions {
  onRename: (id: number, name: string | null) => void;
  onRenameMany?: RenameMany;
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
  readonly selectedNodes: ReadonlySet<number>;
  onHover: (id: number | null) => void;
  onSelect: (id: number, additive: boolean) => void;
  onClose?: () => void;
  edits?: LayerEditActions | null;
  onToggleLocked?: (id: number, locked: boolean) => void;
  busy?: boolean;
  hoveredNode?: number | null;
  readonly isEmpty: boolean;
}

const toMenuItems = (
  edits: LayerEditActions,
  many: RenameManyApi
): PreviewMenuItem[] => {
  const items = edits.menuItems?.() ?? [];

  if (!many.canOpen) {
    return items;
  }

  return [
    {
      icon: "pencil",
      id: "rename-layers",
      label: COPY.renameManyMenu,
      run: many.open,
    },
    ...items,
  ];
};

const toMenu = (
  rowMenu: RowMenuApi,
  edits: LayerEditActions | null,
  many: RenameManyApi
): ReactNode => {
  const { at, close: handleClose } = rowMenu;

  if (!at || !edits?.menuItems) {
    return null;
  }

  return (
    <PreviewMenu
      at={at}
      label={COPY.labelLayerActions}
      items={toMenuItems(edits, many)}
      onClose={handleClose}
    />
  );
};

const LayersPanel = ({
  tree,
  frameName,
  selectedNode: confirmed,
  selectedNodes: confirmedNodes,
  onHover,
  onSelect,
  onClose,
  edits: editsProp,
  onToggleLocked,
  busy = false,
  hoveredNode = null,
  isEmpty,
}: LayersPanelProps): ReactNode => {
  const edits = editsProp ?? null;
  const isMac = IS_MAC;
  const onEscape = focusStageQuietly;

  const state = usePanelState({
    confirmed,
    confirmedNodes,
    edits,
    frameName,
    isMac,
    onEscape,
    onHover,
    onSelect,
    onToggleLocked,
    tree,
  });

  const { list, listRef, onKeyDown, rename, rowMenu, rowsRef } = state;

  return (
    <aside className="layers" aria-label={COPY.labelLayers}>
      <LayersHeader
        frameName={frameName}
        isBusy={busy}
        onClose={onClose ?? null}
        onRunTool={toRunTool(state.selectedNode, edits)}
        toTip={tipWithKey}
      />
      <LayerSearchField search={state.search} />
      <div className={styles.anchor}>
        {rename.many.isOpen && <RenameManyPopup many={rename.many} />}
      </div>
      <LayersList
        ref={listRef}
        isBusy={busy}
        isDragging={list.drag.dragging !== null}
        isEmpty={isEmpty}
        isSearching={state.search.isActive}
        rowCount={state.rows.length}
        selectedIndex={list.selectedIndex}
        selectedNode={state.selectedNode}
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
          dimmed={state.dimmed}
          dropInto={list.drag.drop?.into ?? null}
          dropLine={list.drag.drop?.line ?? null}
          editingKey={rename.editingKey}
          first={list.rowWindow.first}
          hoveredNode={hoveredNode}
          isEditable={edits !== null}
          keys={state.keys}
          last={list.rowWindow.last}
          rows={state.rows}
          selectedNodes={state.selectedNodes}
        />
      </LayersList>
      {toMenu(rowMenu, edits, rename.many)}
    </aside>
  );
};

export { LayersPanel };

export type { LayerEditActions, LayersPanelProps };
