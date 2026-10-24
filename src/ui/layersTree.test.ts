import { describe, expect, it } from 'vitest';
import { ancestorsOf, cleanName, defaultCollapsed, dropTarget, editableName, parentOf, parseLayerTree, siblingRow, treeKeyAction, visibleRows } from './layersTree';

const raw = {
  nodes: [
    { id: 1, depth: 0, tag: 'header', name: '.top', text: '', childCount: 1, hidden: false },
    { id: 2, depth: 1, tag: 'nav', name: '', text: '', childCount: 2, hidden: false },
    { id: 3, depth: 2, tag: 'a', name: '', text: 'Home', childCount: 0, hidden: false },
    { id: 4, depth: 2, tag: 'a', name: '', text: 'About', childCount: 0, hidden: true },
    { id: 5, depth: 0, tag: 'main', name: '', text: '', childCount: 0, hidden: false },
  ],
  truncated: false,
};

describe('layers tree', () => {
  it('keeps only safe fields and caps depth jumps', () => {
    const tree = parseLayerTree({ nodes: [{ id: 1, depth: 4, tag: 'div<script>', name: 'x'.repeat(200), text: 7 }, { id: 'bad' }], truncated: 'yes' });
    expect(tree.nodes).toEqual([{ id: 1, depth: 0, tag: 'divscript', name: 'x'.repeat(60), text: '', childCount: 0, hidden: false }]);
    expect(tree.truncated).toBe(false);
  });

  it('hides the rows under a collapsed node', () => {
    const { nodes } = parseLayerTree(raw);
    expect(visibleRows(nodes, new Set()).map((n) => n.id)).toEqual([1, 2, 3, 4, 5]);
    expect(visibleRows(nodes, new Set([2])).map((n) => n.id)).toEqual([1, 2, 5]);
    expect(visibleRows(nodes, new Set([1, 2])).map((n) => n.id)).toEqual([1, 5]);
  });

  it('finds ancestors and the parent', () => {
    const { nodes } = parseLayerTree(raw);
    expect(ancestorsOf(nodes, 4)).toEqual([2, 1]);
    expect(parentOf(nodes, 5)).toBeNull();
    expect(defaultCollapsed(nodes, 1)).toEqual(new Set([2]));
  });

  it('maps tree keys to select and toggle actions', () => {
    const { nodes } = parseLayerTree(raw);
    const open = visibleRows(nodes, new Set());
    expect(treeKeyAction('ArrowDown', false, nodes, open, null, new Set())).toEqual({ select: 1 });
    expect(treeKeyAction('ArrowDown', false, nodes, open, 2, new Set())).toEqual({ select: 3 });
    expect(treeKeyAction('ArrowLeft', false, nodes, open, 2, new Set())).toEqual({ toggle: 2, open: false });
    expect(treeKeyAction('ArrowLeft', false, nodes, open, 3, new Set())).toEqual({ select: 2 });
    expect(treeKeyAction('ArrowRight', false, nodes, visibleRows(nodes, new Set([2])), 2, new Set([2]))).toEqual({ toggle: 2, open: true });
    expect(treeKeyAction('Enter', false, nodes, open, 1, new Set())).toEqual({ select: 2 });
    expect(treeKeyAction('Enter', true, nodes, open, 3, new Set())).toEqual({ select: 2 });
    expect(treeKeyAction('Tab', false, nodes, open, 3, new Set())).toBeNull();
  });

  it('finds siblings and one-step drop targets for a dragged row', () => {
    const { nodes } = parseLayerTree(raw);
    const open = visibleRows(nodes, new Set());
    expect(siblingRow(open, 0, 1)).toBe(4);
    expect(siblingRow(open, 4, -1)).toBe(0);
    expect(siblingRow(open, 2, -1)).toBeNull();
    expect(dropTarget(open, 5, 10, 28)).toEqual({ move: 'up', line: 0 });
    expect(dropTarget(open, 5, 4 * 28 + 10, 28)).toBeNull();
    expect(dropTarget(open, 1, 2 * 28, 28)).toBeNull();
    expect(dropTarget(open, 1, 4 * 28 + 2, 28)).toEqual({ move: 'down', line: 5 * 28 });
    expect(dropTarget(open, 3, 3 * 28 + 4, 28)).toEqual({ move: 'down', line: 4 * 28 });
    expect(dropTarget(open, 3, 10, 28)).toBeNull();
  });

  it('cleans names for data-name', () => {
    expect(editableName('.top')).toBe('');
    expect(editableName('Hero title')).toBe('Hero title');
    expect(cleanName('Hero "big" <title> & {x}')).toBe('Hero big title  x');
  });
});
