import { LAYER_LABEL_MAX, LAYER_TREE_MAX, type LayerNode, type ReorderMove } from '../shared/contracts';

const LOC_MAX = 1100;

export interface LayerTree {
  nodes: LayerNode[];
  truncated: boolean;
}

function text(value: unknown, max: number): string {
  return typeof value === 'string' ? value.slice(0, max) : '';
}

function count(value: unknown): number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 ? value : 0;
}

export function parseLayerTree(raw: { nodes?: unknown; truncated?: unknown }): LayerTree {
  const list = Array.isArray(raw.nodes) ? raw.nodes.slice(0, LAYER_TREE_MAX) : [];
  const nodes: LayerNode[] = [];
  for (const item of list) {
    if (!item || typeof item !== 'object') continue;
    const n = item as Record<string, unknown>;
    if (typeof n.id !== 'number' || !Number.isInteger(n.id)) continue;
    const depth = Math.min(count(n.depth), (nodes.at(-1)?.depth ?? -1) + 1);
    nodes.push({
      id: n.id,
      depth,
      tag: text(n.tag, 32).replace(/[^a-z0-9-]/gi, ''),
      name: text(n.name, LAYER_LABEL_MAX),
      text: text(n.text, LAYER_LABEL_MAX),
      childCount: count(n.childCount),
      hidden: n.hidden === true,
      ...(typeof n.loc === 'string' && n.loc.length <= LOC_MAX ? { loc: n.loc } : {}),
      ...(n.locked === true ? { locked: true } : {}),
    });
  }
  return { nodes, truncated: raw.truncated === true };
}

export function visibleRows(nodes: LayerNode[], collapsed: ReadonlySet<number>): LayerNode[] {
  const rows: LayerNode[] = [];
  let skipBelow = Infinity;
  for (const node of nodes) {
    if (node.depth > skipBelow) continue;
    skipBelow = Infinity;
    rows.push(node);
    if (node.childCount > 0 && collapsed.has(node.id)) skipBelow = node.depth;
  }
  return rows;
}

export function layerKeys(nodes: LayerNode[]): Map<number, string> {
  const keys = new Map<number, string>();
  const stack: { key: string; counts: Map<string, number> }[] = [{ key: '', counts: new Map() }];
  for (const node of nodes) {
    stack.length = Math.min(stack.length, node.depth + 1);
    const parent = stack[stack.length - 1] as { key: string; counts: Map<string, number> };
    const index = parent.counts.get(node.tag) ?? 0;
    parent.counts.set(node.tag, index + 1);
    const key = `${parent.key}/${node.tag}${index}`;
    keys.set(node.id, key);
    stack.push({ key, counts: new Map() });
  }
  return keys;
}

export function ancestorsOf(nodes: LayerNode[], id: number): number[] {
  const index = nodes.findIndex((n) => n.id === id);
  if (index < 0) return [];
  const out: number[] = [];
  let depth = (nodes[index] as LayerNode).depth;
  for (let i = index - 1; i >= 0 && depth > 0; i -= 1) {
    const node = nodes[i] as LayerNode;
    if (node.depth < depth) {
      out.push(node.id);
      depth = node.depth;
    }
  }
  return out;
}

export function parentOf(nodes: LayerNode[], id: number): number | null {
  return ancestorsOf(nodes, id)[0] ?? null;
}

export function defaultCollapsed(nodes: LayerNode[], openDepth: number): Set<number> {
  return new Set(nodes.filter((n) => n.childCount > 0 && n.depth >= openDepth).map((n) => n.id));
}

export type TreeAction = { select: number } | { toggle: number; open: boolean } | null;

function firstChildOf(nodes: LayerNode[], node: LayerNode): number | null {
  if (node.childCount === 0) return null;
  return nodes[nodes.indexOf(node) + 1]?.id ?? null;
}

function stepAction(rows: LayerNode[], index: number, step: 1 | -1): TreeAction {
  const target = index < 0 ? rows[0] : rows[index + step];
  return target ? { select: target.id } : null;
}

function expandAction(nodes: LayerNode[], node: LayerNode, collapsed: ReadonlySet<number>, open: boolean): TreeAction {
  if (open) {
    if (node.childCount === 0) return null;
    if (collapsed.has(node.id)) return { toggle: node.id, open: true };
    const child = firstChildOf(nodes, node);
    return child === null ? null : { select: child };
  }
  if (node.childCount > 0 && !collapsed.has(node.id)) return { toggle: node.id, open: false };
  const parent = parentOf(nodes, node.id);
  return parent === null ? null : { select: parent };
}

export function treeKeyAction(key: string, shift: boolean, nodes: LayerNode[], rows: LayerNode[], selected: number | null, collapsed: ReadonlySet<number>): TreeAction {
  const index = selected === null ? -1 : rows.findIndex((r) => r.id === selected);
  if (key === 'ArrowDown') return stepAction(rows, index, 1);
  if (key === 'ArrowUp') return stepAction(rows, index, -1);
  const node = index >= 0 ? rows[index] : undefined;
  if (!node) return null;
  if (key === 'ArrowRight') return expandAction(nodes, node, collapsed, true);
  if (key === 'ArrowLeft') return expandAction(nodes, node, collapsed, false);
  if (key !== 'Enter') return null;
  const target = shift ? parentOf(nodes, node.id) : firstChildOf(nodes, node);
  return target === null ? null : { select: target };
}

export function subtreeEnd(rows: LayerNode[], index: number): number {
  const depth = rows[index]?.depth ?? 0;
  let end = index + 1;
  while (end < rows.length && (rows[end] as LayerNode).depth > depth) end += 1;
  return end;
}

export function siblingRow(rows: LayerNode[], index: number, step: 1 | -1): number | null {
  const depth = rows[index]?.depth;
  if (depth === undefined) return null;
  for (let i = index + step; i >= 0 && i < rows.length; i += step) {
    const row = rows[i] as LayerNode;
    if (row.depth < depth) return null;
    if (row.depth === depth) return i;
  }
  return null;
}

export interface DropTarget {
  move: ReorderMove;
  line: number;
}

export function dropTarget(rows: LayerNode[], id: number, y: number, rowHeight: number): DropTarget | null {
  const index = rows.findIndex((r) => r.id === id);
  if (index < 0) return null;
  if (y < index * rowHeight) {
    const prev = siblingRow(rows, index, -1);
    return prev === null ? null : { move: 'up', line: prev * rowHeight };
  }
  if (y < subtreeEnd(rows, index) * rowHeight) return null;
  const next = siblingRow(rows, index, 1);
  return next === null ? null : { move: 'down', line: subtreeEnd(rows, next) * rowHeight };
}

const FALLBACK_LABEL = /^[#.]/;
const UNSAFE_NAME_CHARS = /["'`<>{}&\\\u0000-\u001f\u007f]/g;

export function editableName(name: string): string {
  return FALLBACK_LABEL.test(name) ? '' : name;
}

export function cleanName(value: string): string {
  return value.replace(UNSAFE_NAME_CHARS, '').slice(0, LAYER_LABEL_MAX);
}

const CONTAINER_TAGS = new Set(['div', 'section', 'main', 'article', 'aside', 'header', 'footer', 'nav', 'form', 'ul', 'ol', 'li', 'figure', 'body']);
const EDGE_ZONE = 0.25;

export interface LayerDropTarget {
  drop: { into: number } | { before: number } | { after: number };
  line: number | null;
  into: number | null;
}

function edgeDrop(rows: LayerNode[], index: number, after: boolean, rowHeight: number): LayerDropTarget {
  const row = rows[index] as LayerNode;
  const next = rows[index + 1];
  if (!after) return { drop: { before: row.id }, line: index * rowHeight, into: null };
  if (next && next.depth > row.depth) return { drop: { before: next.id }, line: (index + 1) * rowHeight, into: null };
  return { drop: { after: row.id }, line: (index + 1) * rowHeight, into: null };
}

export function layerDrop(rows: LayerNode[], id: number, y: number, rowHeight: number): LayerDropTarget | null {
  const from = rows.findIndex((r) => r.id === id);
  const index = Math.floor(y / rowHeight);
  const row = rows[index];
  if (from < 0 || !row || (index >= from && index < subtreeEnd(rows, from))) return null;
  const frac = y / rowHeight - index;
  const canHold = row.childCount > 0 || (CONTAINER_TAGS.has(row.tag) && row.text === '');
  if (canHold && frac > EDGE_ZONE && frac < 1 - EDGE_ZONE) return { drop: { into: row.id }, line: null, into: row.id };
  return edgeDrop(rows, index, frac >= 0.5, rowHeight);
}

export function adjacentMove(rows: LayerNode[], id: number, y: number, rowHeight: number): DropTarget | null {
  const from = rows.findIndex((r) => r.id === id);
  const index = Math.floor(y / rowHeight);
  const prev = from < 0 ? null : siblingRow(rows, from, -1);
  const next = from < 0 ? null : siblingRow(rows, from, 1);
  const onPrev = prev !== null && index >= prev && index < from;
  const onNext = next !== null && index >= next && index < subtreeEnd(rows, next);
  return onPrev || onNext ? dropTarget(rows, id, y, rowHeight) : null;
}
