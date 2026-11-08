import type {
  ReorderMove,
  SelectionContext,
  StructureKey,
} from "@design-studio/contracts";
import type { ReactElement } from "react";
import { useCallback, useSyncExternalStore } from "react";

import type { LiveStore } from "../../platform/live-store.js";
import {
  selectionTargets,
  structureMenuItems,
} from "../inspector/structure-edits.js";
import type { LayerDrop } from "../inspector/structure-edits.js";
import { LayersPanel } from "../versions-layers-tokens/layers-panel.js";
import type { LayerTree } from "../versions-layers-tokens/layers-tree.js";
import type { LayerEdits } from "../versions-layers-tokens/use-layer-edits.js";
import type { PreviewMenuItem } from "./preview-menu.js";
import type { HoverBox } from "./preview-rect-model.js";

interface TreeFrames {
  tree: LayerTree | null;
  selectedNode: number | null;
  hoverNode: (id: number | null) => void;
  selectNode: (id: number, additive: boolean) => void;
  hover: LiveStore<HoverBox | null>;
}

const useHoveredNode = (hover: LiveStore<HoverBox | null>): number | null => {
  const read = (): number | null => hover.get()?.node ?? null;

  return useSyncExternalStore(hover.subscribe, read, read);
};

const CanvasLayersPanel = ({
  frames,
  edits,
  frameName,
  selection,
  onSelectMode,
  onClose,
}: {
  frames: TreeFrames;
  edits: LayerEdits;
  frameName: string;
  selection: SelectionContext[];
  onSelectMode: () => void;
  onClose?: () => void;
}): ReactElement => {
  const hasSelection = selection.length > 0;
  const hoveredNode = useHoveredNode(frames.hover);

  const menuState = {
    canPaste: edits.canPaste,
    count: selection.length,
    hasSource: selectionTargets(selection) !== null,
    isBusy: edits.busy,
  };

  let actions: {
    menuItems: () => PreviewMenuItem[];
    onDrop: (id: number, drop: LayerDrop) => void;
    onMove: (id: number, move: ReorderMove) => void;
    onMoveSelected: (move: ReorderMove) => void;
    onRename: (id: number, name: string | null) => void;
    onStructureKey: (key: StructureKey) => void;
    onToggleHidden: (id: number, hidden: boolean) => void;
  } | null = null;

  if (edits.enabled) {
    actions = {
      menuItems: (): PreviewMenuItem[] =>
        structureMenuItems(menuState, edits.structureKey),
      onDrop: edits.dropNode,
      onMove: edits.moveNode,
      onMoveSelected: edits.moveSelected,
      onRename: edits.renameNode,
      onStructureKey: edits.structureKey,
      onToggleHidden: edits.setNodeHidden,
    };
  }

  let selectedNode2: number | null = null;

  if (hasSelection) {
    selectedNode2 = frames.selectedNode;
  }

  const handleToggleLocked = edits.setNodeLocked;
  const handleHover = frames.hoverNode;

  const handleSelect = useCallback(
    (id: number, additive: boolean): void => {
      onSelectMode();
      frames.selectNode(id, additive);
    },
    [onSelectMode, frames]
  );

  return (
    <LayersPanel
      tree={edits.tree ?? frames.tree}
      edits={actions}
      onToggleLocked={handleToggleLocked}
      busy={!edits.settled}
      frameName={frameName}
      selectedNode={selectedNode2}
      onHover={handleHover}
      hoveredNode={hoveredNode}
      onSelect={handleSelect}
      onClose={onClose}
    />
  );
};

export { CanvasLayersPanel };
