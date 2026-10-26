import { useEffect, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent as ReactPointerEvent, type RefObject, type UIEvent } from 'react';
import type { LayerNode, ReorderMove } from '../../shared/contracts';
import { reorderMoveOf } from '../../shared/reorder';
import { ancestorsOf, cleanName, dropTarget, editableName, treeKeyAction, visibleRows, type DropTarget, type LayerTree } from '../layersTree';
import { Icon } from './Icon';

const ROW = 28;
const OVERSCAN = 8;
const OPEN_DEPTH = 2;
const DRAG_START_PX = 4;

export interface LayerEditActions {
  onRename: (id: number, name: string | null) => void;
  onToggleHidden: (id: number, hidden: boolean) => void;
  onMove: (id: number, move: ReorderMove) => void;
  onMoveSelected: (move: ReorderMove) => void;
}

interface Props {
  tree: LayerTree | null;
  frameName: string;
  selectedNode: number | null;
  onHover: (id: number | null) => void;
  onSelect: (id: number, additive: boolean) => void;
  onClose?: () => void;
  edits?: LayerEditActions | null;
  busy?: boolean;
}

function useCollapsed(nodes: LayerNode[], selectedNode: number | null) {
  const known = useRef(new Set<number>());
  const [collapsed, setCollapsed] = useState<Set<number>>(() => new Set());
  useLayoutEffect(() => {
    const fresh = nodes.filter((n) => !known.current.has(n.id));
    if (fresh.length === 0) return;
    for (const n of fresh) known.current.add(n.id);
    const closed = fresh.filter((n) => n.childCount > 0 && n.depth >= OPEN_DEPTH).map((n) => n.id);
    if (closed.length > 0) setCollapsed((prev) => new Set([...prev, ...closed]));
  }, [nodes]);
  useLayoutEffect(() => {
    if (selectedNode === null) return;
    const open = ancestorsOf(nodes, selectedNode);
    if (!open.some((id) => collapsed.has(id))) return;
    setCollapsed((prev) => {
      const next = new Set(prev);
      for (const id of open) next.delete(id);
      return next;
    });
  }, [nodes, selectedNode, collapsed]);
  const toggle = (id: number, open?: boolean) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      const shouldOpen = open ?? next.has(id);
      if (shouldOpen) next.delete(id);
      else next.add(id);
      return next;
    });
  return { collapsed, toggle };
}

function RenameInput({ initial, onDone }: { initial: string; onDone: (value: string | null) => void }) {
  const [value, setValue] = useState(initial);
  const done = useRef(false);
  const finish = (next: string | null) => {
    if (done.current) return;
    done.current = true;
    onDone(next);
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
  onRenameDone: (node: LayerNode, value: string | null) => void;
  onToggleHidden: (node: LayerNode) => void;
}

function EyeButton({ node, onToggleHidden }: { node: LayerNode; onToggleHidden: (node: LayerNode) => void }) {
  return (
    <button
      type="button"
      className="layers-eye"
      tabIndex={-1}
      aria-label={node.hidden ? 'Show' : 'Hide'}
      aria-pressed={node.hidden}
      title={node.hidden ? 'Show  ⇧⌘H' : 'Hide  ⇧⌘H'}
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

function LayerRow(p: RowProps) {
  const { node } = p;
  const full = [node.tag, node.name, node.text].filter(Boolean).join(' ');
  return (
    <div
      id={`layer-${node.id}`}
      role="treeitem"
      aria-level={node.depth + 1}
      aria-selected={p.selected}
      aria-expanded={node.childCount > 0 ? !p.collapsed : undefined}
      className={`layers-row${p.selected ? ' selected' : ''}${node.hidden ? ' is-hidden' : ''}`}
      style={{ top: p.top, paddingLeft: 4 + node.depth * 12 }}
      title={full}
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
      <span className="layers-tag">{node.tag}</span>
      {p.editing ? (
        <RenameInput initial={editableName(node.name)} onDone={(value) => p.onRenameDone(node, value)} />
      ) : (
        <>
          {node.name && <span className="layers-name">{node.name}</span>}
          {node.text && <span className="layers-text">{node.text}</span>}
        </>
      )}
      {p.editable && !p.editing ? <EyeButton node={node} onToggleHidden={p.onToggleHidden} /> : node.hidden && <span className="layers-flag">Hidden</span>}
    </div>
  );
}

function useRowDrag(rows: LayerNode[], rowsRef: RefObject<HTMLDivElement | null>, onMove: ((id: number, move: ReorderMove) => void) | null) {
  const drag = useRef<{ id: number; startY: number; active: boolean } | null>(null);
  const [drop, setDrop] = useState<DropTarget | null>(null);
  const [dragging, setDragging] = useState<number | null>(null);
  const reset = () => {
    drag.current = null;
    setDrop(null);
    setDragging(null);
  };
  const onPress = (id: number, e: ReactPointerEvent<HTMLDivElement>) => {
    drag.current = onMove ? { id, startY: e.clientY, active: false } : null;
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
    setDrop(dropTarget(rows, cur.id, e.clientY - top, ROW));
  };
  const onPointerUp = () => {
    const cur = drag.current;
    if (cur?.active && drop && onMove) onMove(cur.id, drop.move);
    reset();
  };
  return { drop, dragging, onPress, onPointerMove, onPointerUp, onPointerCancel: reset };
}

export function LayersPanel({ tree, frameName, selectedNode, onHover, onSelect, onClose, edits, busy = false }: Props) {
  const nodes = useMemo(() => tree?.nodes ?? [], [tree]);
  const { collapsed, toggle } = useCollapsed(nodes, selectedNode);
  const rows = useMemo(() => visibleRows(nodes, collapsed), [nodes, collapsed]);
  const listRef = useRef<HTMLDivElement>(null);
  const rowsRef = useRef<HTMLDivElement>(null);
  const [scroll, setScroll] = useState({ top: 0, height: 600 });
  const [editing, setEditing] = useState<number | null>(null);
  const drag = useRowDrag(rows, rowsRef, edits?.onMove ?? null);

  useLayoutEffect(() => {
    const el = listRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setScroll({ top: el.scrollTop, height: el.clientHeight }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

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

  const finishRename = (node: LayerNode, value: string | null) => {
    setEditing(null);
    listRef.current?.focus();
    if (value === null || !edits || value === editableName(node.name)) return;
    edits.onRename(node.id, value === '' ? null : value);
  };

  return (
    <aside className="layers" aria-label="Layers">
      <header className="layers-head">
        <span className="layers-title">Layers</span>
        <span className="layers-frame" title={frameName}>
          {frameName}
        </span>
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
        onScroll={(e: UIEvent<HTMLDivElement>) => setScroll({ top: e.currentTarget.scrollTop, height: e.currentTarget.clientHeight })}
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
                editing={editing === node.id}
                editable={Boolean(edits)}
                onToggle={toggle}
                onHover={onHover}
                onSelect={onSelect}
                onPress={drag.onPress}
                onStartRename={setEditing}
                onRenameDone={finishRename}
                onToggleHidden={(n) => edits?.onToggleHidden(n.id, !n.hidden)}
              />
            ))}
            {drag.drop && <div className="layers-drop" data-testid="layers-drop" style={{ top: drag.drop.line }} />}
          </div>
        )}
        {tree?.truncated && <div className="layers-note">Showing the first {tree.nodes.length} layers.</div>}
      </div>
    </aside>
  );
}
