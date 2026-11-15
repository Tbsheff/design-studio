import type {
  ReorderMove,
  SelectionContext,
  StructureKey,
} from "@design-studio/contracts";
import type { ReactElement } from "react";
import { useCallback, useSyncExternalStore } from "react";

import type { LiveStore } from "../../platform/live-store.js";
import {
  toSelectionTargets,
  toStructureMenuEntries,
} from "../inspector/index.js";
import type { LayerDrop } from "../inspector/index.js";
import { LayersPanel } from "../versions-layers-tokens/layers-panel.js";
import type { LayerTree } from "../versions-layers-tokens/layers-tree.js";
import type { LayerEdits } from "../versions-layers-tokens/use-layer-edits.js";
import type { PreviewMenuItem } from "./preview-menu.js";
import type { HoverBox } from "./preview-rect-model.js";
import { toSelectedNodes } from "./preview-selection-model.js";
import type { NodeMap } from "./preview-selection-model.js";

interface TreeFrames {
  tree: LayerTree | null;
  selectedNode: number | null;
  selectedNodes: NodeMap;
  hoverNode: (id: number | null) => void;
  selectNode: (id: number, additive: boolean) => void;
  hover: LiveStore<HoverBox | null>;
}

interface CanvasLayersPanelProps {
  frames: TreeFrames;
  readonly isEmpty: boolean;
  edits: LayerEdits;
  frameName: string;
  selection: SelectionContext[];
  onSelectMode: () => void;
  onClose?: () => void;
}

const useHoveredNode = (hover: LiveStore<HoverBox | null>): number | null => {
  const read = (): number | null => hover.get()?.node ?? null;

  return useSyncExternalStore(hover.subscribe, read, read);
};

interface LayerMenuState {
  readonly canPaste: boolean;
  readonly count: number;
  readonly hasSource: boolean;
  readonly isBusy: boolean;
}

interface CanvasLayerActions {
  readonly menuItems: () => PreviewMenuItem[];
  readonly onDrop: (id: number, drop: LayerDrop) => void;
  readonly onMove: (id: number, move: ReorderMove) => void;
  readonly onMoveSelected: (move: ReorderMove) => void;
  readonly onRename: (id: number, name: string | null) => void;
  readonly onRenameMany: (ids: number[], names: (string | null)[]) => void;
  readonly onStructureKey: (key: StructureKey) => void;
  readonly onToggleHidden: (id: number, hidden: boolean) => void;
}

const toLayerActions = (
  edits: LayerEdits,
  menuState: LayerMenuState
): CanvasLayerActions | null => {
  if (!edits.enabled) {
    return null;
  }

  return {
    menuItems: (): PreviewMenuItem[] =>
      toStructureMenuEntries(menuState, edits.structureKey, false),
    onDrop: edits.dropNode,
    onMove: edits.moveNode,
    onMoveSelected: edits.moveSelected,
    onRename: edits.renameNode,
    onRenameMany: edits.renameNodes,
    onStructureKey: edits.structureKey,
    onToggleHidden: edits.setNodeHidden,
  };
};

const CanvasLayersPanel = ({
  frames,
  edits,
  frameName,
  isEmpty,
  selection,
  onSelectMode,
  onClose,
}: CanvasLayersPanelProps): ReactElement => {
  const hasSelection = selection.length > 0;
  const hoveredNode = useHoveredNode(frames.hover);

  const menuState = {
    canPaste: edits.canPaste,
    count: selection.length,
    hasSource: toSelectionTargets(selection) !== null,
    isBusy: edits.busy,
  };

  const actions = toLayerActions(edits, menuState);

  let selectedNode2: number | null = null;

  if (hasSelection) {
    selectedNode2 = frames.selectedNode;
  }

  const nodes = frames.selectedNodes;
  const selectedNodes = toSelectedNodes(selection, nodes, selectedNode2);

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
      isEmpty={isEmpty}
      selectedNode={selectedNode2}
      selectedNodes={selectedNodes}
      onHover={handleHover}
      hoveredNode={hoveredNode}
      onSelect={handleSelect}
      onClose={onClose}
    />
  );
};

export { CanvasLayersPanel };
