import { useEffect, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent, type UIEvent } from 'react';
import type { LayerNode } from '../../shared/contracts';
import { ancestorsOf, treeKeyAction, visibleRows, type LayerTree } from '../layersTree';
import { Icon } from './Icon';

const ROW = 28;
const OVERSCAN = 8;
const OPEN_DEPTH = 2;

interface Props {
  tree: LayerTree | null;
  frameName: string;
  selectedNode: number | null;
  onHover: (id: number | null) => void;
  onSelect: (id: number, additive: boolean) => void;
  onClose: () => void;
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

function LayerRow({ node, top, selected, collapsed, onToggle, onHover, onSelect }: {
  node: LayerNode;
  top: number;
  selected: boolean;
  collapsed: boolean;
  onToggle: (id: number) => void;
  onHover: (id: number | null) => void;
  onSelect: (id: number, additive: boolean) => void;
}) {
  const full = [node.tag, node.name, node.text].filter(Boolean).join(' ');
  return (
    <div
      id={`layer-${node.id}`}
      role="treeitem"
      aria-level={node.depth + 1}
      aria-selected={selected}
      aria-expanded={node.childCount > 0 ? !collapsed : undefined}
      className={`layers-row${selected ? ' selected' : ''}${node.hidden ? ' is-hidden' : ''}`}
      style={{ top, paddingLeft: 4 + node.depth * 12 }}
      title={full}
      onPointerEnter={() => onHover(node.id)}
      onPointerLeave={() => onHover(null)}
      onPointerDown={(e) => {
        if (e.button !== 0) return;
        e.preventDefault();
        e.currentTarget.closest<HTMLElement>('[role="tree"]')?.focus();
        onSelect(node.id, e.shiftKey);
      }}
    >
      {node.childCount > 0 ? (
        <span
          className={`layers-twisty${collapsed ? '' : ' open'}`}
          aria-hidden="true"
          onPointerDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onToggle(node.id);
          }}
        >
          <Icon name="chevronRight" size={12} />
        </span>
      ) : (
        <span className="layers-twisty" aria-hidden="true" />
      )}
      <span className="layers-tag">{node.tag}</span>
      {node.name && <span className="layers-name">{node.name}</span>}
      {node.text && <span className="layers-text">{node.text}</span>}
      {node.hidden && <span className="layers-flag">Hidden</span>}
    </div>
  );
}

export function LayersPanel({ tree, frameName, selectedNode, onHover, onSelect, onClose }: Props) {
  const nodes = useMemo(() => tree?.nodes ?? [], [tree]);
  const { collapsed, toggle } = useCollapsed(nodes, selectedNode);
  const rows = useMemo(() => visibleRows(nodes, collapsed), [nodes, collapsed]);
  const listRef = useRef<HTMLDivElement>(null);
  const [scroll, setScroll] = useState({ top: 0, height: 600 });

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

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const action = treeKeyAction(e.key, e.shiftKey, nodes, rows, selectedIndex >= 0 ? selectedNode : null, collapsed);
    if (!action) return;
    e.preventDefault();
    if ('select' in action) onSelect(action.select, false);
    else toggle(action.toggle, action.open);
  };

  return (
    <aside className="layers" aria-label="Layers">
      <header className="layers-head">
        <span className="layers-title">Layers</span>
        <span className="layers-frame" title={frameName}>
          {frameName}
        </span>
        <button type="button" className="icon-btn small" aria-label="Close layers" data-tip="Close  ⌥1" data-tip-align="end" onClick={onClose}>
          <Icon name="close" size={14} />
        </button>
      </header>
      <div
        ref={listRef}
        className="layers-list"
        role="tree"
        aria-label="Layers"
        tabIndex={0}
        aria-activedescendant={selectedIndex >= 0 ? `layer-${selectedNode}` : undefined}
        onKeyDown={onKeyDown}
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
          <div className="layers-rows" style={{ height: rows.length * ROW }}>
            {rows.slice(first, last).map((node, i) => (
              <LayerRow
                key={node.id}
                node={node}
                top={(first + i) * ROW}
                selected={node.id === selectedNode}
                collapsed={collapsed.has(node.id)}
                onToggle={toggle}
                onHover={onHover}
                onSelect={onSelect}
              />
            ))}
          </div>
        )}
        {tree?.truncated && <div className="layers-note">Showing the first {tree.nodes.length} layers.</div>}
      </div>
    </aside>
  );
}
