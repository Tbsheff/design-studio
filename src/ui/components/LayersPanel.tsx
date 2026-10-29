import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent as ReactPointerEvent, type RefObject, type UIEvent } from 'react';
import type { LayerNode, ReorderMove, StructureKey } from '../../shared/contracts';
import { reorderMoveOf } from '../../shared/reorder';
import { STRUCTURE_KEY_IDS, structureKeyOf } from '../../shared/structure-keys';
import { IS_MAC, tipWithKey } from '../commands/keys';
import { adjacentMove, ancestorsOf, cleanName, dropTarget, editableName, layerDrop, layerKeys, treeKeyAction, visibleRows, type LayerTree } from '../layersTree';
import type { LayerDrop } from '../structureEdits';
import { Icon, type IconName } from './Icon';
import { PreviewMenu, type PreviewMenuItem } from './PreviewMenu';

const ROW = 28;
const TEXT_TAGS = new Set(['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'span', 'em', 'strong', 'b', 'i', 'small', 'label', 'li', 'blockquote', 'figcaption', 'dt', 'dd', 'code', 'pre', 'time', 'mark', 'sup', 'sub', 'cite', 'q', 'abbr']);
const IMAGE_TAGS = new Set(['img', 'picture', 'video', 'canvas', 'iframe']);
const VECTOR_TAGS = new Set(['svg', 'path', 'circle', 'rect', 'ellipse', 'line', 'polyline', 'polygon', 'g', 'use']);
const CONTROL_TAGS = new Set(['button', 'input', 'select', 'textarea']);

function layerIcon(node: LayerNode): IconName {
  const tag = node.tag.toLowerCase();
  if (IMAGE_TAGS.has(tag)) return 'image';
  if (VECTOR_TAGS.has(tag)) return 'token';
  if (tag === 'a') return 'link';
  if (CONTROL_TAGS.has(tag)) return 'pointer';
  if (TEXT_TAGS.has(tag) || (node.childCount === 0 && node.text)) return 'alignLeft';
  return 'frame';
}
const OVERSCAN = 8;
const OPEN_DEPTH = 2;
const DRAG_START_PX = 4;

export interface LayerEditActions {
  onRename: (id: number, name: string | null) => void;
  onToggleHidden: (id: number, hidden: boolean) => void;
  onMove: (id: number, move: ReorderMove) => void;
  onMoveSelected: (move: ReorderMove) => void;
  onStructureKey?: (key: StructureKey) => void;
  onDrop?: (id: number, drop: LayerDrop) => void;
  menuItems?: () => PreviewMenuItem[];
}

interface Props {
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

interface OpenState {
  collapsed: Set<string>;
  known: Set<string>;
  scrollTop: number;
}

const openStates = new Map<string, OpenState>();

function openStateFor(scope: string): OpenState {
  let state = openStates.get(scope);
  if (!state) {
    state = { collapsed: new Set(), known: new Set(), scrollTop: 0 };
    openStates.set(scope, state);
  }
  return state;
}

function idsOf(nodes: LayerNode[], keys: Map<number, string>, collapsed: ReadonlySet<string>): Set<number> {
  const out = new Set<number>();
  for (const node of nodes) {
    const key = keys.get(node.id);
    if (key !== undefined && collapsed.has(key)) out.add(node.id);
  }
  return out;
}

function addDefaults(nodes: LayerNode[], keys: Map<number, string>, state: OpenState): boolean {
  let changed = false;
  for (const node of nodes) {
    const key = keys.get(node.id);
    if (key === undefined || state.known.has(key)) continue;
    state.known.add(key);
    if (node.childCount > 0 && node.depth >= OPEN_DEPTH) {
      state.collapsed.add(key);
      changed = true;
    }
  }
  return changed;
}

function useCollapsed(nodes: LayerNode[], selectedNode: number | null, scope: string) {
  const keys = useMemo(() => layerKeys(nodes), [nodes]);
  const state = openStateFor(scope);
  const [version, setVersion] = useState(0);
  const bump = useCallback(() => setVersion((v) => v + 1), []);
  if (addDefaults(nodes, keys, state)) state.collapsed = new Set(state.collapsed);
  const collapsed = useMemo(() => idsOf(nodes, keys, state.collapsed), [nodes, keys, state.collapsed, version]);
  useLayoutEffect(() => {
    if (selectedNode === null) return;
    const open = ancestorsOf(nodes, selectedNode).filter((id) => collapsed.has(id));
    if (open.length === 0) return;
    const next = new Set(state.collapsed);
    for (const id of open) next.delete(keys.get(id) ?? '');
    state.collapsed = next;
    bump();
  }, [nodes, keys, selectedNode, collapsed, state, bump]);
  const toggle = useCallback(
    (id: number, open?: boolean) => {
      const key = keys.get(id);
      if (key === undefined) return;
      const next = new Set(state.collapsed);
      const shouldOpen = open ?? next.has(key);
      if (shouldOpen) next.delete(key);
      else next.add(key);
      state.collapsed = next;
      bump();
    },
    [keys, state, bump],
  );
  return { collapsed, toggle, keys };
}

function useLatest<A extends unknown[], R>(fn: (...args: A) => R): (...args: A) => R {
  const ref = useRef(fn);
  ref.current = fn;
  return useCallback((...args: A) => ref.current(...args), []);
}

function RenameInput({ initial, onDone }: { initial: string; onDone: (value: string | null, next?: 1 | -1) => void }) {
  const [value, setValue] = useState(initial);
  const done = useRef(false);
  const finish = (next: string | null, step?: 1 | -1) => {
    if (done.current) return;
    done.current = true;
    onDone(next, step);
  };
  return (
    <input
      className="layers-rename"
      aria-label="Layer name"
      placeholder="Name this layer"
      value={value}
      maxLength={60}
      autoFocus
      spellCheck={false}
      onFocus={(e) => e.currentTarget.select()}
      onChange={(e) => setValue(cleanName(e.target.value))}
      onPointerDown={(e) => e.stopPropagation()}
      onDoubleClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => {
        e.stopPropagation();
        if (e.key === 'Enter') finish(value.trim());
        else if (e.key === 'Escape') finish(null);
        else if (e.key === 'Tab') {
          e.preventDefault();
          finish(value.trim(), e.shiftKey ? -1 : 1);
        }
      }}
      onBlur={() => finish(value.trim())}
    />
  );
}

interface RowProps {
  node: LayerNode;
  top: number;
  selected: boolean;
  collapsed: boolean;
  editing: boolean;
  editable: boolean;
  onToggle: (id: number) => void;
  onHover: (id: number | null) => void;
  onSelect: (id: number, additive: boolean) => void;
  onPress: (id: number, e: ReactPointerEvent<HTMLDivElement>) => void;
  onStartRename: (id: number) => void;
  onMenu: (node: LayerNode, at: { x: number; y: number }) => void;
  dropInto: boolean;
  onRenameDone: (node: LayerNode, value: string | null, next?: 1 | -1) => void;
  hovered: boolean;
  onToggleHidden: (node: LayerNode) => void;
  onToggleLocked: ((node: LayerNode) => void) | null;
}

function LockButton({ node, onToggle }: { node: LayerNode; onToggle: (node: LayerNode) => void }) {
  const label = node.locked ? 'Unlock' : 'Lock';
  return (
    <button
      type="button"
      className="layers-eye layers-lock"
      tabIndex={-1}
      aria-label={label}
      aria-pressed={node.locked === true}
      data-tip={`${label}  ⇧⌘L`}
      data-tip-align="end"
      onPointerDown={(e) => e.stopPropagation()}
      onDoubleClick={(e) => e.stopPropagation()}
      onClick={(e) => {
        e.stopPropagation();
        onToggle(node);
      }}
    >
      <Icon name={node.locked ? 'lock' : 'unlock'} size={14} />
    </button>
  );
}

function EyeButton({ node, onToggleHidden }: { node: LayerNode; onToggleHidden: (node: LayerNode) => void }) {
  return (
    <button
      type="button"
      className="layers-eye"
      tabIndex={-1}
      aria-label={node.hidden ? 'Show' : 'Hide'}
      aria-pressed={node.hidden}
      data-tip={node.hidden ? 'Show  ⇧⌘H' : 'Hide  ⇧⌘H'}
      data-tip-align="end"
      onPointerDown={(e) => e.stopPropagation()}
      onDoubleClick={(e) => e.stopPropagation()}
      onClick={(e) => {
        e.stopPropagation();
        onToggleHidden(node);
      }}
    >
      <Icon name={node.hidden ? 'eyeOff' : 'eye'} size={14} />
    </button>
  );
}

const LayerRow = memo(function LayerRow(p: RowProps) {
  const { node } = p;
  const full = [node.tag, node.name, node.text].filter(Boolean).join(' ');
  return (
    <div
      id={`layer-${node.id}`}
      role="treeitem"
      aria-level={node.depth + 1}
      aria-selected={p.selected}
      aria-expanded={node.childCount > 0 ? !p.collapsed : undefined}
      className={`layers-row${p.selected ? ' selected' : ''}${p.hovered ? ' hovered' : ''}${node.hidden ? ' is-hidden' : ''}${node.locked ? ' is-locked' : ''}${p.dropInto ? ' drop-into' : ''}`}
      style={{ top: p.top, paddingLeft: 4 + node.depth * 12 }}
      data-tip={full}
      onPointerEnter={() => p.onHover(node.id)}
      onPointerLeave={() => p.onHover(null)}
      onPointerDown={(e) => {
        if (e.button !== 0) return;
        e.preventDefault();
        e.currentTarget.closest<HTMLElement>('[role="tree"]')?.focus();
        p.onSelect(node.id, e.shiftKey);
        p.onPress(node.id, e);
      }}
      onDoubleClick={() => p.editable && p.onStartRename(node.id)}
      onContextMenu={(e) => {
        e.preventDefault();
        p.onMenu(node, { x: e.clientX, y: e.clientY });
      }}
    >
      {node.childCount > 0 ? (
        <span
          className={`layers-twisty${p.collapsed ? '' : ' open'}`}
          aria-hidden="true"
          onPointerDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            p.onToggle(node.id);
          }}
        >
          <Icon name="chevronRight" size={12} />
        </span>
      ) : (
        <span className="layers-twisty" aria-hidden="true" />
      )}
      <span className="layers-kind" aria-hidden="true">
        <Icon name={layerIcon(node)} size={12} />
      </span>
      <span className="layers-tag">{node.tag}</span>
      {p.editing ? (
        <RenameInput initial={editableName(node.name)} onDone={(value, next) => p.onRenameDone(node, value, next)} />
      ) : (
        <>
          {node.name && <span className="layers-name">{node.name}</span>}
          {node.text && <span className="layers-text">{node.text}</span>}
        </>
      )}
      {p.onToggleLocked && !p.editing && <LockButton node={node} onToggle={p.onToggleLocked} />}
      {p.editable && !p.editing ? <EyeButton node={node} onToggleHidden={p.onToggleHidden} /> : node.hidden && <span className="layers-flag">Hidden</span>}
    </div>
  );
});

interface RowDrop {
  line: number | null;
  into: number | null;
  commit: () => void;
}

interface DragHandlers {
  onMove: ((id: number, move: ReorderMove) => void) | null;
  onDrop: ((id: number, drop: LayerDrop) => void) | null;
}

function rowDrop(rows: LayerNode[], id: number, y: number, handlers: DragHandlers): RowDrop | null {
  const { onDrop, onMove } = handlers;
  const target = onDrop ? layerDrop(rows, id, y, ROW) : null;
  if (onDrop && target?.into != null) return { line: null, into: target.into, commit: () => onDrop(id, target.drop) };
  const swap = onMove ? (onDrop ? adjacentMove : dropTarget)(rows, id, y, ROW) : null;
  if (swap && onMove) return { line: swap.line, into: null, commit: () => onMove(id, swap.move) };
  return target && onDrop ? { line: target.line, into: null, commit: () => onDrop(id, target.drop) } : null;
}

function useRowDrag(rows: LayerNode[], rowsRef: RefObject<HTMLDivElement | null>, handlers: DragHandlers) {
  const drag = useRef<{ id: number; startY: number; active: boolean } | null>(null);
  const [drop, setDrop] = useState<RowDrop | null>(null);
  const [dragging, setDragging] = useState<number | null>(null);
  const reset = () => {
    drag.current = null;
    setDrop(null);
    setDragging(null);
  };
  const onPress = (id: number, e: ReactPointerEvent<HTMLDivElement>) => {
    drag.current = handlers.onMove || handlers.onDrop ? { id, startY: e.clientY, active: false } : null;
  };
  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const cur = drag.current;
    if (!cur || (e.buttons & 1) === 0) return;
    if (!cur.active) {
      if (Math.abs(e.clientY - cur.startY) < DRAG_START_PX) return;
      cur.active = true;
      setDragging(cur.id);
      e.currentTarget.setPointerCapture(e.pointerId);
    }
    const top = rowsRef.current?.getBoundingClientRect().top ?? 0;
    setDrop(rowDrop(rows, cur.id, e.clientY - top, handlers));
  };
  const onPointerUp = () => {
    if (drag.current?.active && drop) drop.commit();
    reset();
  };
  return { drop, dragging, onPress, onPointerMove, onPointerUp, onPointerCancel: reset };
}

const TOOLS: { key: StructureKey; label: string; icon: 'copy' | 'frame' | 'expand' | 'trash' | 'layers' }[] = [
  { key: 'duplicate', label: 'Duplicate', icon: 'copy' },
  { key: 'group', label: 'Group selection', icon: 'layers' },
  { key: 'wrap', label: 'Wrap in auto layout', icon: 'frame' },
  { key: 'unwrap', label: 'Unwrap', icon: 'expand' },
  { key: 'delete', label: 'Delete', icon: 'trash' },
];

function LayerTools({ run, busy }: { run: (key: StructureKey) => void; busy: boolean }) {
  return (
    <div className="layers-tools" role="toolbar" aria-label="Layer actions">
      {TOOLS.map((tool) => (
        <button key={tool.key} type="button" className="icon-btn small" aria-label={tool.label} aria-disabled={busy || undefined} data-tip={tipWithKey(tool.label, STRUCTURE_KEY_IDS[tool.key])} data-tip-align="end" onClick={() => !busy && run(tool.key)}>
          <Icon name={tool.icon} size={14} />
        </button>
      ))}
    </div>
  );
}

function useRowMenu(edits: LayerEditActions | null | undefined, selectedNode: number | null, onSelect: (id: number, additive: boolean) => void) {
  const [at, setAt] = useState<{ x: number; y: number } | null>(null);
  const open = (node: LayerNode, point: { x: number; y: number }) => {
    if (!edits?.menuItems) return;
    if (node.id !== selectedNode) onSelect(node.id, false);
    setAt(point);
  };
  const close = () => setAt(null);
  const menu = at && edits?.menuItems ? <PreviewMenu at={at} label="Layer actions" items={edits.menuItems()} onClose={close} /> : null;
  return { open, menu };
}

function isLockKey(e: KeyboardEvent<HTMLDivElement>): boolean {
  return e.key.toLowerCase() === 'l' && e.shiftKey && (e.metaKey || e.ctrlKey) && !e.altKey;
}

function scopeOf(frameName: string): string {
  return `${typeof location === 'undefined' ? '' : location.pathname}|${frameName}`;
}

function sameWindow(a: { top: number; height: number }, b: { top: number; height: number }): boolean {
  return Math.floor(a.top / ROW) === Math.floor(b.top / ROW) && Math.ceil((a.top + a.height) / ROW) === Math.ceil((b.top + b.height) / ROW);
}

function useListWindow(listRef: RefObject<HTMLDivElement | null>, state: OpenState, ready: boolean) {
  const [scroll, setScrollState] = useState({ top: state.scrollTop, height: 600 });
  const setScroll = useCallback((next: { top: number; height: number }) => setScrollState((prev) => (sameWindow(prev, next) ? prev : next)), []);
  const restored = useRef(false);
  useLayoutEffect(() => {
    const el = listRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setScroll({ top: el.scrollTop, height: el.clientHeight }));
    ro.observe(el);
    return () => ro.disconnect();
  }, [listRef, setScroll]);
  useLayoutEffect(() => {
    const el = listRef.current;
    if (!el || !ready || restored.current) return;
    restored.current = true;
    el.scrollTop = state.scrollTop;
  }, [listRef, state, ready]);
  const onScroll = (e: UIEvent<HTMLDivElement>) => {
    state.scrollTop = e.currentTarget.scrollTop;
    setScroll({ top: e.currentTarget.scrollTop, height: e.currentTarget.clientHeight });
  };
  return { scroll, onScroll };
}

const PENDING_MS = 1500;

function usePendingSelect(selectedNode: number | null, onSelect: (id: number, additive: boolean) => void) {
  const [pending, setPending] = useState<number | null>(null);
  useEffect(() => setPending(null), [selectedNode]);
  useEffect(() => {
    if (pending === null) return;
    const timer = window.setTimeout(() => setPending(null), PENDING_MS);
    return () => window.clearTimeout(timer);
  }, [pending]);
  const select = useCallback(
    (id: number, additive: boolean) => {
      if (!additive) setPending(id);
      onSelect(id, additive);
    },
    [onSelect],
  );
  return { shown: pending ?? selectedNode, select };
}

export function LayersPanel({ tree, frameName, selectedNode: confirmed, onHover, onSelect: onSelectProp, onClose, edits, onToggleLocked, busy = false, hoveredNode = null }: Props) {
  const nodes = useMemo(() => tree?.nodes ?? [], [tree]);
  const latestSelect = useLatest(onSelectProp);
  const { shown: selectedNode, select: onSelect } = usePendingSelect(confirmed, latestSelect);
  const scope = scopeOf(frameName);
  const { collapsed, toggle, keys } = useCollapsed(nodes, selectedNode, scope);
  const rows = useMemo(() => visibleRows(nodes, collapsed), [nodes, collapsed]);
  const listRef = useRef<HTMLDivElement>(null);
  const rowsRef = useRef<HTMLDivElement>(null);
  const { scroll, onScroll } = useListWindow(listRef, openStateFor(scope), rows.length > 0);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const setEditing = useCallback((id: number | null) => setEditingKey(id === null ? null : (keys.get(id) ?? null)), [keys]);
  const startRename = useLatest(setEditing);
  const drag = useRowDrag(rows, rowsRef, { onMove: edits?.onMove ?? null, onDrop: edits?.onDrop ?? null });
  const rowMenu = useRowMenu(edits, selectedNode, onSelect);
  const rowHover = useLatest(onHover);
  const rowSelect = useLatest(onSelect);
  const rowToggle = useLatest(toggle);
  const rowPress = useLatest(drag.onPress);
  const rowMenuOpen = useLatest(rowMenu.open);
  const rowHidden = useLatest((n: LayerNode) => edits?.onToggleHidden(n.id, !n.hidden));
  const rowLocked = useLatest((n: LayerNode) => onToggleLocked?.(n.id, !n.locked));

  const selectedIndex = selectedNode === null ? -1 : rows.findIndex((r) => r.id === selectedNode);
  useEffect(() => {
    const el = listRef.current;
    if (!el || selectedIndex < 0) return;
    const top = selectedIndex * ROW;
    if (top < el.scrollTop) el.scrollTop = top;
    else if (top + ROW > el.scrollTop + el.clientHeight) el.scrollTop = top + ROW - el.clientHeight;
  }, [selectedIndex]);

  const first = Math.max(0, Math.floor(scroll.top / ROW) - OVERSCAN);
  const last = Math.min(rows.length, Math.ceil((scroll.top + scroll.height) / ROW) + OVERSCAN);
  const selectedRow = selectedIndex >= 0 ? rows[selectedIndex] : undefined;

  const editKey = (e: KeyboardEvent<HTMLDivElement>): boolean => {
    if (!edits || !selectedRow) return false;
    const move = reorderMoveOf(e);
    if (move) {
      edits.onMoveSelected(move);
      return true;
    }
    const structure = edits.onStructureKey && !e.repeat ? structureKeyOf(e, IS_MAC) : null;
    if (structure) {
      edits.onStructureKey?.(structure);
      return true;
    }
    if (e.key === 'F2' && !e.shiftKey && !e.altKey && !e.metaKey && !e.ctrlKey) {
      setEditing(selectedRow.id);
      return true;
    }
    if (e.key.toLowerCase() === 'h' && e.shiftKey && (e.metaKey || e.ctrlKey) && !e.altKey) {
      edits.onToggleHidden(selectedRow.id, !selectedRow.hidden);
      return true;
    }
    return false;
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (onToggleLocked && selectedRow && isLockKey(e)) {
      e.preventDefault();
      onToggleLocked(selectedRow.id, !selectedRow.locked);
      return;
    }
    if (editKey(e)) {
      e.preventDefault();
      return;
    }
    const action = treeKeyAction(e.key, e.shiftKey, nodes, rows, selectedIndex >= 0 ? selectedNode : null, collapsed);
    if (!action) return;
    e.preventDefault();
    if ('select' in action) onSelect(action.select, false);
    else toggle(action.toggle, action.open);
  };

  const finishRename = useLatest((node: LayerNode, value: string | null, step?: 1 | -1) => {
    const at = rows.findIndex((r) => r.id === node.id);
    const next = step && at >= 0 ? rows[at + step] : undefined;
    setEditing(next ? next.id : null);
    if (next) onSelect(next.id, false);
    else listRef.current?.focus();
    if (value === null || !edits || value === editableName(node.name)) return;
    edits.onRename(node.id, value === '' ? null : value);
  });

  return (
    <aside className="layers" aria-label="Layers">
      <header className="layers-head">
        <span className="layers-title">Layers</span>
        <span className="layers-frame" data-tip={frameName}>
          {frameName}
        </span>
        {edits?.onStructureKey && selectedNode !== null && <LayerTools run={edits.onStructureKey} busy={busy} />}
        {onClose && (
          <button type="button" className="icon-btn small" aria-label="Close layers" data-tip="Close  ⌥1" data-tip-align="end" onClick={onClose}>
            <Icon name="close" size={14} />
          </button>
        )}
      </header>
      <div
        ref={listRef}
        className={`layers-list${drag.dragging !== null ? ' dragging' : ''}`}
        role="tree"
        aria-label="Layers"
        tabIndex={0}
        aria-activedescendant={selectedIndex >= 0 ? `layer-${selectedNode}` : undefined}
        aria-busy={busy}
        onKeyDown={onKeyDown}
        onPointerMove={drag.onPointerMove}
        onPointerUp={drag.onPointerUp}
        onPointerCancel={drag.onPointerCancel}
        onScroll={onScroll}
      >
        {tree === null ? (
          <div className="layers-empty" role="status">
            <span className="spinner" aria-hidden="true" />
            Reading layers…
          </div>
        ) : rows.length === 0 ? (
          <div className="layers-empty">This frame has no elements yet.</div>
        ) : (
          <div ref={rowsRef} className="layers-rows" style={{ height: rows.length * ROW }}>
            {rows.slice(first, last).map((node, i) => (
              <LayerRow
                key={node.id}
                node={node}
                top={(first + i) * ROW}
                selected={node.id === selectedNode}
                collapsed={collapsed.has(node.id)}
                editing={editingKey !== null && keys.get(node.id) === editingKey}
                editable={Boolean(edits)}
                hovered={node.id === hoveredNode}
                onToggle={rowToggle}
                onHover={rowHover}
                onSelect={rowSelect}
                onPress={rowPress}
                onStartRename={startRename}
                onMenu={rowMenuOpen}
                dropInto={drag.drop?.into === node.id}
                onRenameDone={finishRename}
                onToggleHidden={rowHidden}
                onToggleLocked={onToggleLocked ? rowLocked : null}
              />
            ))}
            {drag.drop && drag.drop.line !== null && <div className="layers-drop" data-testid="layers-drop" style={{ top: drag.drop.line }} />}
          </div>
        )}
        {tree?.truncated && <div className="layers-note">Showing the first {tree.nodes.length} layers.</div>}
      </div>
      {rowMenu.menu}
    </aside>
  );
}
