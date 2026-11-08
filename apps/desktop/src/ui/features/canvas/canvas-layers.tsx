import { selectMoveOf } from "@design-studio/contracts";
import type { SelectMove, SelectionContext } from "@design-studio/contracts";
import { Icon } from "@design-studio/ui";
import type { ReactElement } from "react";
import { useEffect, useRef, useSyncExternalStore } from "react";

import type { LiveStore } from "../../platform/live-store.js";
import { canvasHasKeys } from "../../platform/typing-target.js";
import {
  selectionTargets,
  structureMenuItems,
} from "../inspector/structure-edits.js";
import { LayersPanel } from "../versions-layers-tokens/layers-panel.js";
import type { LayerTree } from "../versions-layers-tokens/layers-tree.js";
import type { LayerEdits } from "../versions-layers-tokens/use-layer-edits.js";
import { copy } from "./copy.js";
import { isTypingTarget } from "./use-pan-zoom.js";
import type { HoverBox } from "./use-preview-frames.js";

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
    isBusy: edits.busy,
    canPaste: edits.canPaste,
    count: selection.length,
    hasSource: selectionTargets(selection) !== null,
  };

  const actions = edits.enabled
    ? {
        menuItems: () => structureMenuItems(menuState, edits.structureKey),
        onDrop: edits.dropNode,
        onMove: edits.moveNode,
        onMoveSelected: edits.moveSelected,
        onRename: edits.renameNode,
        onStructureKey: edits.structureKey,
        onToggleHidden: edits.setNodeHidden,
      }
    : null;

  return (
    <LayersPanel
      tree={edits.tree ?? frames.tree}
      edits={actions}
      onToggleLocked={edits.setNodeLocked}
      busy={!edits.settled}
      frameName={frameName}
      selectedNode={hasSelection ? frames.selectedNode : null}
      onHover={frames.hoverNode}
      hoveredNode={hoveredNode}
      onSelect={(id, additive) => {
        onSelectMode();
        frames.selectNode(id, additive);
      }}
      onClose={onClose}
    />
  );
};

const EditNotice = ({
  edits,
}: {
  edits: Pick<LayerEdits, "notice" | "clearNotice">;
}): ReactElement | null => {
  if (!edits.notice) {
    return null;
  }

  return (
    <div className="edit-notice" role="status">
      <span>{edits.notice}</span>
      <button
        type="button"
        className="icon-btn small"
        aria-label={copy.dismiss}
        onClick={edits.clearNotice}
      >
        <Icon name="close" size={14} />
      </button>
    </div>
  );
};

const useLayersWatch = (
  watch: (on: boolean) => void,
  open: boolean,
  frontToken: string | null,
  onToggle: () => void
): void => {
  const toggle = useRef(onToggle);
  toggle.current = onToggle;
  useEffect(() => {
    watch(open);
  }, [watch, open, frontToken]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (
        !e.altKey ||
        e.metaKey ||
        e.ctrlKey ||
        e.shiftKey ||
        e.code !== "Digit1" ||
        isTypingTarget(e.target)
      ) {
        return;
      }

      e.preventDefault();
      toggle.current();
    };

    globalThis.addEventListener("keydown", onKey);

    return (): void => globalThis.removeEventListener("keydown", onKey);
  }, []);
};

const useSelectMoveKeys = (
  selectMode: boolean,
  selection: SelectionContext[],
  selectRelative: (selector: string, move: SelectMove) => void
): void => {
  const live = useRef({ selectMode, selectRelative, selection });
  live.current = { selectMode, selectRelative, selection };
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      const cur = live.current;
      const last = cur.selection.at(-1);

      if (!cur.selectMode || !last || !canvasHasKeys()) {
        return;
      }

      const move = selectMoveOf(e);

      if (!move) {
        return;
      }

      e.preventDefault();
      cur.selectRelative(last.selector, move);
    };

    globalThis.addEventListener("keydown", onKey);

    return (): void => globalThis.removeEventListener("keydown", onKey);
  }, []);
};

export { CanvasLayersPanel, EditNotice, useLayersWatch, useSelectMoveKeys };
