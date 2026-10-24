import { useEffect, useRef } from 'react';
import { selectMoveOf, type SelectMove, type SelectionContext } from '../../shared/contracts';
import { uiStore } from '../storage';
import { isTypingTarget } from '../usePanZoom';
import type { LayerTree } from '../layersTree';
import type { LayerEdits } from '../useLayerEdits';
import { Icon } from './Icon';
import { LayersPanel } from './LayersPanel';

interface TreeFrames {
  tree: LayerTree | null;
  selectedNode: number | null;
  hoverNode: (id: number | null) => void;
  selectNode: (id: number, additive: boolean) => void;
}

export function CanvasLayersPanel({ frames, edits, frameName, hasSelection, onSelectMode }: { frames: TreeFrames; edits: LayerEdits; frameName: string; hasSelection: boolean; onSelectMode: () => void }) {
  const actions = edits.enabled
    ? {
        onRename: edits.renameNode,
        onToggleHidden: edits.setNodeHidden,
        onMove: edits.moveNode,
        onMoveSelected: edits.moveSelected,
      }
    : null;
  return (
    <LayersPanel
      tree={edits.tree ?? frames.tree}
      edits={actions}
      busy={!edits.settled}
      frameName={frameName}
      selectedNode={hasSelection ? frames.selectedNode : null}
      onHover={frames.hoverNode}
      onSelect={(id, additive) => {
        onSelectMode();
        frames.selectNode(id, additive);
      }}
      onClose={() => uiStore.set({ layersOpen: false })}
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

export function LayersToggle({ open, disabled }: { open: boolean; disabled: boolean }) {
  return (
    <button
      type="button"
      className="icon-btn"
      aria-label="Layers"
      aria-pressed={open}
      aria-keyshortcuts="Alt+1"
      data-tip={disabled ? 'Layers show for the live preview' : 'Layers  ⌥1'}
      data-tip-align="start"
      disabled={disabled}
      onClick={() => uiStore.set((s) => ({ layersOpen: !s.layersOpen }))}
    >
      <Icon name="layers" />
    </button>
  );
}

export function useLayersWatch(watch: (on: boolean) => void, open: boolean, frontToken: string | null): void {
  useEffect(() => {
    watch(open);
  }, [watch, open, frontToken]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!e.altKey || e.metaKey || e.ctrlKey || e.shiftKey || e.code !== 'Digit1' || isTypingTarget(e.target)) return;
      e.preventDefault();
      uiStore.set((s) => ({ layersOpen: !s.layersOpen }));
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
