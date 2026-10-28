import type { AlignOp, ArrangeAction, ArrangeMode, MeasureRect } from './arrange.js';
import type { SourceLoc } from './contracts.js';

export interface Sides {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface ArrangeTargetFacts {
  selector: string;
  tag: string;
  source: SourceLoc | null;
  rect: MeasureRect;
  position: string;
  left: number;
  top: number;
  margin: Sides;
  alignSelf: string;
  copies: number;
}

export interface ArrangeParentFacts {
  selector: string;
  tag: string;
  source: SourceLoc | null;
  display: string;
  flexDirection: string;
  flexWrap: string;
  rowGap: number;
  columnGap: number;
  justifyContent: string;
  alignItems: string;
  justifyItems: string;
  padding: Sides;
  rect: MeasureRect;
  inFlow: number;
  allSelected: boolean;
}

export interface ArrangeFacts {
  targets: ArrangeTargetFacts[];
  parent: ArrangeParentFacts | null;
  sameParent: boolean;
  container: MeasureRect | null;
}

export interface PlannedArrangeWrite {
  selector: string;
  tag: string;
  source: SourceLoc | null;
  style: Record<string, string | null>;
}

export type ArrangePlan = { ok: true; mode: ArrangeMode; writes: PlannedArrangeWrite[]; note: string | null } | { ok: false; reason: string };

type Axis = 'horizontal' | 'vertical';
type Edge = 'start' | 'center' | 'end';
type Item = ArrangeTargetFacts;

export const NOT_SIBLINGS = 'Pick siblings: these elements have different parents.';
export const NO_AUTO_LAYOUT = 'The parent has no auto layout. Add auto layout (Shift+A) or use Tidy up.';
export const ALREADY_ALIGNED = 'Already aligned.';
const MAIN_NEEDS_ALL = 'This moves every child of the auto layout. Select all of its children, or align across its axis.';
const DISTRIBUTE_NEEDS_ALL = 'Distribute in an auto layout spaces every child. Select all of its children.';
const DISTRIBUTE_CROSS = 'An auto layout cannot space its children across its axis. Change its direction first.';
const GRID_PARTIAL = 'Horizontal align of some grid children is not available. Select all children of the grid, or align them vertically.';
const GRID_DISTRIBUTE = 'Distribute is not available in a grid. Use Tidy up to set one gap.';
const MIXED_POSITION = 'Pick elements with the same kind of position: some are absolute and some are in the layout.';
const NEED_THREE = 'Distribute needs three or more elements.';
const NEED_TWO = 'Tidy up needs two or more elements.';

const ALIGN_AXIS: Record<AlignOp, Axis> = { left: 'horizontal', center: 'horizontal', right: 'horizontal', top: 'vertical', middle: 'vertical', bottom: 'vertical' };
const ALIGN_EDGE: Record<AlignOp, Edge> = { left: 'start', top: 'start', center: 'center', middle: 'center', right: 'end', bottom: 'end' };
const FLEX_VALUE: Record<Edge, string> = { start: 'flex-start', center: 'center', end: 'flex-end' };
const GRID_VALUE: Record<Edge, string> = { start: 'start', center: 'center', end: 'end' };

const px = (value: number) => `${Math.round(value)}px`;
const isAbsolute = (item: Item) => item.position === 'absolute' || item.position === 'fixed';
const startOf = (rect: MeasureRect, axis: Axis) => (axis === 'horizontal' ? rect.x : rect.y);
const sizeOf = (rect: MeasureRect, axis: Axis) => (axis === 'horizontal' ? rect.width : rect.height);
const endOf = (rect: MeasureRect, axis: Axis) => startOf(rect, axis) + sizeOf(rect, axis);

function normalEdge(value: string, normalIsStart: boolean): string {
  if (value === 'flex-start' || value === 'start' || value === 'self-start' || value === 'left' || value === 'top') return 'start';
  if (value === 'flex-end' || value === 'end' || value === 'self-end' || value === 'right' || value === 'bottom') return 'end';
  if (value === 'normal' && normalIsStart) return 'start';
  return value;
}

function sameValue(current: string, next: string, normalIsStart: boolean): boolean {
  return normalEdge(current, normalIsStart) === normalEdge(next, normalIsStart);
}

function sorted(items: Item[], axis: Axis): Item[] {
  return [...items].sort((a, b) => startOf(a.rect, axis) - startOf(b.rect, axis));
}

function gapsAlong(items: Item[], axis: Axis): number[] {
  const list = sorted(items, axis);
  return list.slice(1).map((item, index) => startOf(item.rect, axis) - endOf((list[index] as Item).rect, axis));
}

function mean(values: number[]): number {
  return values.length === 0 ? 0 : values.reduce((sum, value) => sum + value, 0) / values.length;
}

function spread(items: Item[], axis: Axis): number {
  const centers = items.map((item) => startOf(item.rect, axis) + sizeOf(item.rect, axis) / 2);
  return Math.max(...centers) - Math.min(...centers);
}

function boundsOf(rects: MeasureRect[]): MeasureRect {
  const x = Math.min(...rects.map((rect) => rect.x));
  const y = Math.min(...rects.map((rect) => rect.y));
  const right = Math.max(...rects.map((rect) => rect.x + rect.width));
  const bottom = Math.max(...rects.map((rect) => rect.y + rect.height));
  return { x, y, width: right - x, height: bottom - y };
}

function write(element: { selector: string; tag: string; source: SourceLoc | null }, style: Record<string, string | null>): PlannedArrangeWrite {
  return { selector: element.selector, tag: element.tag, source: element.source, style };
}

function done(mode: ArrangeMode, writes: PlannedArrangeWrite[], note: string | null = null): ArrangePlan {
  const kept = writes.filter((entry) => Object.keys(entry.style).length > 0);
  return { ok: true, mode, writes: kept, note: kept.length === 0 ? ALREADY_ALIGNED : note };
}

function refuse(reason: string): ArrangePlan {
  return { ok: false, reason };
}

function flexAxis(parent: ArrangeParentFacts): { main: Axis; reverse: boolean } {
  const direction = parent.flexDirection;
  return { main: direction.startsWith('column') ? 'vertical' : 'horizontal', reverse: direction.endsWith('-reverse') };
}

function flip(edge: Edge, reverse: boolean): Edge {
  if (!reverse || edge === 'center') return edge;
  return edge === 'start' ? 'end' : 'start';
}

function flexAlign(facts: ArrangeFacts, parent: ArrangeParentFacts, op: AlignOp): ArrangePlan {
  const { main, reverse } = flexAxis(parent);
  const axis = ALIGN_AXIS[op];
  if (axis === main) {
    if (!parent.allSelected) return refuse(MAIN_NEEDS_ALL);
    const value = FLEX_VALUE[flip(ALIGN_EDGE[op], reverse)];
    return done('auto-layout', [write(parent, sameValue(parent.justifyContent, value, true) ? {} : { 'justify-content': value })]);
  }
  const value = FLEX_VALUE[ALIGN_EDGE[op]];
  if (parent.allSelected) {
    const selfSet = facts.targets.filter((item) => item.alignSelf !== 'auto' && !sameValue(item.alignSelf, value, false));
    return done('auto-layout', [write(parent, sameValue(parent.alignItems, value, false) ? {} : { 'align-items': value }), ...selfSet.map((item) => write(item, { 'align-self': null }))]);
  }
  const current = (item: Item) => (item.alignSelf === 'auto' ? parent.alignItems : item.alignSelf);
  return done('self', facts.targets.map((item) => write(item, sameValue(current(item), value, false) ? {} : { 'align-self': value })));
}

function marginWrites(items: Item[], axis: Axis): PlannedArrangeWrite[] {
  const list = sorted(items, axis);
  const [before, after] = axis === 'vertical' ? (['top', 'bottom'] as const) : (['left', 'right'] as const);
  return list.map((item, index) => {
    const style: Record<string, string | null> = {};
    if (index > 0 && item.margin[before] !== 0) style[`margin-${before}`] = null;
    if (index < list.length - 1 && item.margin[after] !== 0) style[`margin-${after}`] = null;
    return write(item, style);
  });
}

function flexTidy(facts: ArrangeFacts, parent: ArrangeParentFacts): ArrangePlan {
  if (facts.targets.length < 2) return refuse(NEED_TWO);
  const { main } = flexAxis(parent);
  const gap = Math.max(0, Math.round(mean(gapsAlong(facts.targets, main))));
  const current = main === 'horizontal' ? parent.columnGap : parent.rowGap;
  const style: Record<string, string | null> = {};
  if (Math.round(current) !== gap) style.gap = px(gap);
  if (/^space-/.test(parent.justifyContent)) style['justify-content'] = 'flex-start';
  return done('auto-layout', [write(parent, style), ...marginWrites(facts.targets, main)]);
}

function flexPlan(facts: ArrangeFacts, parent: ArrangeParentFacts, action: ArrangeAction): ArrangePlan {
  if ('align' in action) return flexAlign(facts, parent, action.align);
  if ('tidy' in action) return flexTidy(facts, parent);
  if (action.distribute !== flexAxis(parent).main) return refuse(DISTRIBUTE_CROSS);
  if (!parent.allSelected) return refuse(DISTRIBUTE_NEEDS_ALL);
  return done('auto-layout', [write(parent, parent.justifyContent === 'space-between' ? {} : { 'justify-content': 'space-between' })]);
}

function gridAlign(facts: ArrangeFacts, parent: ArrangeParentFacts, op: AlignOp): ArrangePlan {
  const value = GRID_VALUE[ALIGN_EDGE[op]];
  if (ALIGN_AXIS[op] === 'horizontal') {
    if (!parent.allSelected) return refuse(GRID_PARTIAL);
    return done('auto-layout', [write(parent, sameValue(parent.justifyItems, value, false) ? {} : { 'justify-items': value })]);
  }
  if (parent.allSelected) return done('auto-layout', [write(parent, sameValue(parent.alignItems, value, false) ? {} : { 'align-items': value })]);
  const current = (item: Item) => (item.alignSelf === 'auto' ? parent.alignItems : item.alignSelf);
  return done('self', facts.targets.map((item) => write(item, sameValue(current(item), value, false) ? {} : { 'align-self': value })));
}

function gridPlan(facts: ArrangeFacts, parent: ArrangeParentFacts, action: ArrangeAction): ArrangePlan {
  if ('align' in action) return gridAlign(facts, parent, action.align);
  if ('distribute' in action) return refuse(GRID_DISTRIBUTE);
  const gap = Math.round(mean([parent.rowGap, parent.columnGap]));
  if (Math.round(parent.rowGap) === gap && Math.round(parent.columnGap) === gap) return done('auto-layout', []);
  return done('auto-layout', [write(parent, { gap: px(gap), 'row-gap': null, 'column-gap': null })]);
}

function moveWrite(item: Item, dx: number, dy: number): PlannedArrangeWrite {
  const style: Record<string, string | null> = {};
  if (Math.abs(dx) >= 0.5) style.left = px(item.left + dx);
  if (Math.abs(dy) >= 0.5) style.top = px(item.top + dy);
  return write(item, style);
}

function alignDelta(rect: MeasureRect, bounds: MeasureRect, op: AlignOp): number {
  const axis = ALIGN_AXIS[op];
  const edge = ALIGN_EDGE[op];
  if (edge === 'start') return startOf(bounds, axis) - startOf(rect, axis);
  if (edge === 'end') return endOf(bounds, axis) - endOf(rect, axis);
  return startOf(bounds, axis) + sizeOf(bounds, axis) / 2 - (startOf(rect, axis) + sizeOf(rect, axis) / 2);
}

function absoluteAlign(facts: ArrangeFacts, op: AlignOp): ArrangePlan {
  const bounds = facts.targets.length === 1 ? (facts.container ?? facts.parent?.rect ?? null) : boundsOf(facts.targets.map((item) => item.rect));
  if (!bounds) return refuse('The element has no box to align to.');
  const horizontal = ALIGN_AXIS[op] === 'horizontal';
  return done('absolute', facts.targets.map((item) => {
    const delta = alignDelta(item.rect, bounds, op);
    return moveWrite(item, horizontal ? delta : 0, horizontal ? 0 : delta);
  }));
}

function placeAlong(items: Item[], axis: Axis, gap: number): PlannedArrangeWrite[] {
  const list = sorted(items, axis);
  let at = startOf((list[0] as Item).rect, axis);
  return list.map((item) => {
    const delta = at - startOf(item.rect, axis);
    at += sizeOf(item.rect, axis) + gap;
    return axis === 'horizontal' ? moveWrite(item, delta, 0) : moveWrite(item, 0, delta);
  });
}

function absoluteDistribute(facts: ArrangeFacts, axis: Axis): ArrangePlan {
  if (facts.targets.length < 3) return refuse(NEED_THREE);
  const list = sorted(facts.targets, axis);
  const total = endOf((list[list.length - 1] as Item).rect, axis) - startOf((list[0] as Item).rect, axis);
  const sizes = list.reduce((sum, item) => sum + sizeOf(item.rect, axis), 0);
  return done('absolute', placeAlong(list, axis, (total - sizes) / (list.length - 1)));
}

function absoluteTidy(facts: ArrangeFacts): ArrangePlan {
  if (facts.targets.length < 2) return refuse(NEED_TWO);
  const axis: Axis = spread(facts.targets, 'horizontal') >= spread(facts.targets, 'vertical') ? 'horizontal' : 'vertical';
  const gap = Math.max(0, Math.round(mean(gapsAlong(facts.targets, axis))));
  return done('absolute', placeAlong(facts.targets, axis, gap));
}

function absolutePlan(facts: ArrangeFacts, action: ArrangeAction): ArrangePlan {
  if ('align' in action) return absoluteAlign(facts, action.align);
  if ('distribute' in action) return absoluteDistribute(facts, action.distribute);
  return absoluteTidy(facts);
}

function stacksVertically(items: Item[]): boolean {
  const list = sorted(items, 'vertical');
  return list.slice(1).every((item, index) => item.rect.y >= endOf((list[index] as Item).rect, 'vertical') - 1);
}

function addAutoLayout(facts: ArrangeFacts, parent: ArrangeParentFacts): ArrangePlan {
  if (facts.targets.length < 2) return refuse(NEED_TWO);
  const axis: Axis = stacksVertically(facts.targets) ? 'vertical' : 'horizontal';
  const gap = Math.max(0, Math.round(mean(gapsAlong(facts.targets, axis))));
  const style: Record<string, string | null> = { display: 'flex', ...(axis === 'vertical' ? { 'flex-direction': 'column' } : {}), gap: px(gap) };
  return done('add-auto-layout', [write(parent, style), ...marginWrites(facts.targets, axis)], `Added auto layout (${axis === 'vertical' ? 'column' : 'row'}, gap ${gap}px) to the parent.`);
}

export function planArrangeFacts(facts: ArrangeFacts, action: ArrangeAction): ArrangePlan {
  if (facts.targets.length === 0) return refuse('Pick one or more elements.');
  if (!facts.sameParent) return refuse(NOT_SIBLINGS);
  const absolute = facts.targets.filter(isAbsolute).length;
  if (absolute > 0 && absolute < facts.targets.length) return refuse(MIXED_POSITION);
  if (absolute > 0) return absolutePlan(facts, action);
  const parent = facts.parent;
  if (!parent) return refuse('The element has no parent to arrange in.');
  if (parent.display.includes('flex')) return flexPlan(facts, parent, action);
  if (parent.display.includes('grid')) return gridPlan(facts, parent, action);
  if ('tidy' in action) return addAutoLayout(facts, parent);
  return refuse(NO_AUTO_LAYOUT);
}
