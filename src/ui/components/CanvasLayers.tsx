import { useEffect, useRef, useSyncExternalStore } from 'react';
import type { LiveStore } from '../liveStore';
import type { HoverBox } from '../usePreviewFrames';
import { selectMoveOf, type SelectMove, type SelectionContext } from '../../shared/contracts';
import { isTypingTarget } from '../typingTarget';
import type { LayerTree } from '../layersTree';
import { selectionTargets, structureMenuItems } from '../structureEdits';
import type { LayerEdits } from '../useLayerEdits';
import { Icon } from './Icon';
import { LayersPanel } from './LayersPanel';

interface TreeFrames {
  tree: LayerTree | null;
  selectedNode: number | null;
  hoverNode: (id: number | null) => void;
  selectNode: (id: number, additive: boolean) => void;
  hover: LiveStore<HoverBox | null>;
}

function useHoveredNode(hover: LiveStore<HoverBox | null>): number | null {
  const read = () => hover.get()?.node ?? null;
  return useSyncExternalStore(hover.subscribe, read, read);
}

export function CanvasLayersPanel({ frames, edits, frameName, selection, onSelectMode, onClose }: { frames: TreeFrames; edits: LayerEdits; frameName: string; selection: SelectionContext[]; onSelectMode: () => void; onClose?: () => void }) {
  const hasSelection = selection.length > 0;
  const hoveredNode = useHoveredNode(frames.hover);
  const menuState = { count: selection.length, hasSource: selectionTargets(selection) !== null, canPaste: edits.canPaste, busy: edits.busy };
  const actions = edits.enabled
    ? {
        onRename: edits.renameNode,
        onToggleHidden: edits.setNodeHidden,
        onMove: edits.moveNode,
        onMoveSelected: edits.moveSelected,
        onStructureKey: edits.structureKey,
        onDrop: edits.dropNode,
        menuItems: () => structureMenuItems(menuState, edits.structureKey),
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
}

export function EditNotice({ edits }: { edits: Pick<LayerEdits, 'notice' | 'clearNotice'> }) {
  if (!edits.notice) return null;
  return (
    <div className="edit-notice" role="status">
      <span>{edits.notice}</span>
      <button type="button" className="icon-btn small" aria-label="Dismiss" onClick={edits.clearNotice}>
        <Icon name="close" size={14} />
      </button>
    </div>
  );
}

export function useLayersWatch(watch: (on: boolean) => void, open: boolean, frontToken: string | null, onToggle: () => void): void {
  const toggle = useRef(onToggle);
  toggle.current = onToggle;
  useEffect(() => {
    watch(open);
  }, [watch, open, frontToken]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!e.altKey || e.metaKey || e.ctrlKey || e.shiftKey || e.code !== 'Digit1' || isTypingTarget(e.target)) return;
      e.preventDefault();
      toggle.current();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}

export function useSelectMoveKeys(selectMode: boolean, selection: SelectionContext[], selectRelative: (selector: string, move: SelectMove) => void): void {
  const live = useRef({ selectMode, selection, selectRelative });
  live.current = { selectMode, selection, selectRelative };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const cur = live.current;
      const last = cur.selection.at(-1);
      if (!cur.selectMode || !last || document.activeElement !== document.body) return;
      const move = selectMoveOf(e);
      if (!move) return;
      e.preventDefault();
      cur.selectRelative(last.selector, move);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}
