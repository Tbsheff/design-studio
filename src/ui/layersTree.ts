import { LAYER_LABEL_MAX, LAYER_TREE_MAX, type LayerNode } from '../shared/contracts';

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
