import type { LayerNode, SelectionContext, StructureEditRequest, StructureKey, StructureTarget } from '../shared/contracts';
import { STRUCTURE_KEY_IDS } from '../shared/structure-keys';
import { parseLoc } from './commentAnchors';
import type { PreviewMenuItem } from './components/PreviewMenu';

export type SelectionOp = 'delete' | 'duplicate' | 'wrap' | 'unwrap' | 'group';
export type LayerDrop = { into: number } | { before: number } | { after: number };

export const NO_SOURCE = 'This element has no source location, so it cannot be changed here.';

export function selectionTargets(selection: SelectionContext[]): StructureTarget[] | null {
  if (selection.length === 0 || selection.some((entry) => !entry.source)) return null;
  return selection.map((entry) => ({ source: entry.source as NonNullable<SelectionContext['source']>, selector: entry.selector, tag: entry.tag.toLowerCase() }));
}

export function nodeTarget(node: LayerNode | undefined): StructureTarget | null {
  const source = parseLoc(node?.loc);
  return node && source ? { source, tag: node.tag } : null;
}

function sameLoc(a: StructureTarget, b: StructureTarget): boolean {
  return a.source.file === b.source.file && a.source.line === b.source.line && a.source.col === b.source.col;
}

export function dropRequest(nodes: LayerNode[], id: number, drop: LayerDrop, selection: SelectionContext[]): StructureEditRequest | null {
  const byId = (key: number) => nodeTarget(nodes.find((node) => node.id === key));
  const dragged = byId(id);
  const refId = 'into' in drop ? drop.into : 'before' in drop ? drop.before : drop.after;
  const ref = byId(refId);
  if (!dragged || !ref) return null;
  const selected = selectionTargets(selection);
  const targets = selected && selected.length > 1 && selected.some((entry) => sameLoc(entry, dragged)) ? selected : [dragged];
  if ('into' in drop) return { op: 'move', targets, into: ref };
  return 'before' in drop ? { op: 'move', targets, before: ref } : { op: 'move', targets, after: ref };
}

export interface StructureMenuState {
  count: number;
  hasSource: boolean;
  canPaste: boolean;
  busy: boolean;
}

const LABELS: Record<StructureKey, string> = {
  delete: 'Delete',
  duplicate: 'Duplicate',
  wrap: 'Wrap in auto layout',
  unwrap: 'Unwrap',
  cut: 'Cut to move',
  paste: 'Move cut layers here',
  group: 'Group selection',
};

const ICONS: Record<StructureKey, PreviewMenuItem['icon']> = {
  delete: 'trash',
  duplicate: 'copy',
  wrap: 'frame',
  unwrap: 'expand',
  cut: 'arrowRight',
  paste: 'arrowDown',
  group: 'layers',
};

const MENU_ORDER: StructureKey[] = ['duplicate', 'group', 'wrap', 'unwrap', 'cut', 'paste', 'delete'];

function blockReason(key: StructureKey, state: StructureMenuState): string | undefined {
  if (!state.hasSource) return NO_SOURCE;
  if (state.busy) return 'Wait for the last edit to finish.';
  if (key === 'paste' && !state.canPaste) return 'Cut a layer first, then select where it goes.';
  return undefined;
}

export function structureMenuItems(state: StructureMenuState, run: (key: StructureKey) => void, leadDivider = false): PreviewMenuItem[] {
  return MENU_ORDER.map((key, index) => {
    const disabled = blockReason(key, state);
    const label = state.count > 1 && key !== 'paste' && key !== 'wrap' && key !== 'group' ? `${LABELS[key]} ${state.count} layers` : LABELS[key];
    return { id: `structure-${key}`, label, icon: ICONS[key], keyId: STRUCTURE_KEY_IDS[key], run: () => run(key), divider: (leadDivider && index === 0) || key === 'delete', ...(disabled ? { disabled } : {}) };
  });
}
