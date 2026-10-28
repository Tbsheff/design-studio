import { useCallback, useRef, useState, type MutableRefObject } from 'react';
import type { SelectionContext, SelectMove, ZoomKey } from '../shared/contracts';
import { formatCopyCss } from './authoredCss';
import type { PreviewPort } from './bridge';
import { commandBlocker, runCommand } from './commands/registry';
import { TRY_VARIANTS_COMMAND } from '../shared/element-variants';
import { PreviewMenu, type PreviewMenuItem } from './components/PreviewMenu';
import { uiStore } from './storage';
import { selectionTargets, structureMenuItems } from './structureEdits';
import { requestAuthoredCss } from './useAuthoredCss';
import { pasteJsx } from './pasteJsx';
import type { LayerEdits } from './useLayerEdits';

interface Options {
  selection: SelectionContext[];
  port: MutableRefObject<PreviewPort | null> | undefined;
  selectRelative: (selector: string, move: SelectMove) => void;
  zoom: (key: ZoomKey) => void;
  edits: Pick<LayerEdits, 'enabled' | 'structureKey' | 'canPaste' | 'busy' | 'notify'>;
  ids: { projectId: string; directionId: string | null };
}

async function copyCss(port: PreviewPort | null, selector: string): Promise<void> {
  const css = await requestAuthoredCss(port, selector);
  if (css) await navigator.clipboard.writeText(formatCopyCss(css)).catch(() => undefined);
}

function structureItems(o: Options): PreviewMenuItem[] {
  const edits = o.edits;
  if (!edits.enabled) return [];
  const state = { count: o.selection.length, hasSource: selectionTargets(o.selection) !== null, canPaste: edits.canPaste, busy: edits.busy };
  return structureMenuItems(state, edits.structureKey, true);
}

function pasteItem(o: Options, target: SelectionContext): PreviewMenuItem[] {
  if (!o.edits.enabled || !o.ids.directionId) return [];
  const blocked = !target.source && !target.owners?.length ? 'This element has no source location' : o.edits.busy ? 'Wait for the last edit to finish' : null;
  const ids = { projectId: o.ids.projectId, directionId: o.ids.directionId };
  return [{ id: 'paste-jsx', label: 'Paste JSX', icon: 'code', divider: true, run: () => pasteJsx(ids, target, o.edits.notify), ...disabledBy(blocked) }];
}

function disabledBy(reason: string | null): { disabled?: string } {
  return reason ? { disabled: reason } : {};
}

function menuItems(o: Options, target: SelectionContext): PreviewMenuItem[] {
  return [
    { id: 'ask', label: 'Ask the agent about this', icon: 'chat', run: () => void runCommand('panel.focus-composer') },
    { id: 'variants', label: 'Try variants…', icon: 'compare', run: () => void runCommand(TRY_VARIANTS_COMMAND), ...disabledBy(commandBlocker(TRY_VARIANTS_COMMAND)) },
    { id: 'parent', label: 'Select parent', icon: 'pointer', keyId: 'select-parent', run: () => o.selectRelative(target.selector, 'parent') },
    { id: 'child', label: 'Select child', icon: 'pointer', keyId: 'select-child', run: () => o.selectRelative(target.selector, 'child') },
    { id: 'copy-css', label: 'Copy CSS', icon: 'copy', run: () => copyCss(o.port?.current ?? null, target.selector) },
    { id: 'zoom', label: 'Zoom to selection', icon: 'search', keyId: 'zoom-selection', run: () => o.zoom('selection') },
    { id: 'layers', label: 'Show in layers', icon: 'layers', keyId: 'layers', run: () => uiStore.set({ layersOpen: true }) },
    ...structureItems(o),
    ...pasteItem(o, target),
  ];
}

export function usePreviewMenu(o: Options) {
  const [at, setAt] = useState<{ x: number; y: number } | null>(null);
  const latest = useRef(o);
  latest.current = o;
  const onContextMenu = useCallback((point: { x: number; y: number }) => setAt(point), []);
  const close = useCallback(() => setAt(null), []);
  const target = o.selection.at(-1);
  const menu = at && target ? <PreviewMenu at={at} label={`Actions for ${target.tag}`} items={menuItems(latest.current, target)} onClose={close} /> : null;
  return { onContextMenu, menu };
}
