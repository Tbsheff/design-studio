import type { MultiPolygon, Pair } from 'polygon-clipping';
import type { BooleanOpName, VectorBox } from '../../shared/vector.js';
import { DEFAULT_SHAPE_FILL } from '../../shared/vector.js';
import { DirectEditError } from './errors.js';
import { applySplices, type Splice } from './splice.js';
import { positionAt } from './structure-ops.js';
import { allPoints, boxOfPoints, combine, ellipseRing, pathRings, rectRing, regionOf, regionPath, round, type Box } from './vector-geometry.js';
import { elementText } from './vector-snippet.js';
import type { VectorDoc, VNode } from './vector-source.js';

type Map2 = { sx: number; sy: number; tx: number; ty: number };

interface Operand {
  node: VNode;
  svg: VNode;
  shapes: VNode[];
  region: MultiPolygon;
}

export interface BooleanPlan {
  code: string;
  at: { line: number; col: number };
  title: string;
}

const SHAPES = new Set(['path', 'rect', 'circle', 'ellipse', 'polygon', 'polyline']);
const NAMES: Record<BooleanOpName, string> = { union: 'Union', subtract: 'Subtract', intersect: 'Intersect', exclude: 'Exclude' };

function refuse(message: string): DirectEditError {
  return new DirectEditError('cannot_restructure', message);
}

function num(node: VNode, name: string, fallback = 0): number {
  const raw = node.attrs[name];
  if (raw === undefined || raw === '') return fallback;
  const value = Number.parseFloat(raw);
  if (!Number.isFinite(value) || /%$/.test(raw)) throw refuse(`<${node.tag}> ${name}="${raw}" is not a plain number`);
  return value;
}

function pointsOf(raw: string): Pair[] {
  const values = raw.trim().split(/[\s,]+/).map(Number);
  const out: Pair[] = [];
  for (let i = 0; i + 1 < values.length; i += 2) out.push([values[i] as number, values[i + 1] as number]);
  return out;
}

function shapeRings(node: VNode): Pair[][] {
  if (node.dynamic.length > 0) throw refuse(`<${node.tag}> sets ${node.dynamic.join(', ')} in code, so its shape is not known`);
  if (node.attrs.transform) throw refuse(`<${node.tag}> has a transform; boolean operations work on shapes without one`);
  if (node.tag === 'path') return pathRings(node.attrs.d ?? '');
  if (node.tag === 'rect') return [rectRing(num(node, 'x'), num(node, 'y'), num(node, 'width'), num(node, 'height'), num(node, 'rx', num(node, 'ry')))];
  if (node.tag === 'circle') return [ellipseRing(num(node, 'cx'), num(node, 'cy'), num(node, 'r'), num(node, 'r'))];
  if (node.tag === 'ellipse') return [ellipseRing(num(node, 'cx'), num(node, 'cy'), num(node, 'rx'), num(node, 'ry'))];
  return [pointsOf(node.attrs.points ?? '')];
}

function shapesIn(node: VNode): VNode[] {
  if (SHAPES.has(node.tag)) return [node];
  if (node.tag === 'g' && node.attrs.transform) throw refuse('A group in the SVG has a transform; boolean operations work on shapes without one');
  return node.children.flatMap(shapesIn);
}

function operandOf(doc: VectorDoc, node: VNode): Operand {
  const svg = node.tag === 'svg' ? node : doc.svgOf(node);
  if (!svg) throw refuse(`<${node.tag}> is not inside an <svg>`);
  const shapes = shapesIn(node);
  if (shapes.length === 0) throw refuse(`<${node.tag}> has no shape (path, rect, circle, ellipse or polygon)`);
  const region = shapes.map((shape) => regionOf(shapeRings(shape))).reduce((sum, next) => (sum.length === 0 ? next : combine('union', sum, next)), [] as MultiPolygon);
  if (region.length === 0) throw refuse(`<${node.tag}> has no area`);
  return { node, svg, shapes, region };
}

function viewBoxOf(svg: VNode): Box {
  const parts = (svg.attrs.viewbox ?? svg.attrs.viewBox ?? '').trim().split(/[\s,]+/).map(Number);
  if (parts.length === 4 && parts.every(Number.isFinite) && (parts[2] as number) > 0 && (parts[3] as number) > 0) return { x: parts[0] as number, y: parts[1] as number, width: parts[2] as number, height: parts[3] as number };
  return { x: 0, y: 0, width: num(svg, 'width', 1) || 1, height: num(svg, 'height', 1) || 1 };
}

function fit(from: Box, to: VectorBox): Map2 {
  const s = Math.min(to.width / (from.width || 1), to.height / (from.height || 1));
  return { sx: s, sy: s, tx: to.x + (to.width - from.width * s) / 2 - from.x * s, ty: to.y + (to.height - from.height * s) / 2 - from.y * s };
}

function stretch(from: Box, to: VectorBox): Map2 {
  const sx = from.width > 0 ? to.width / from.width : 1;
  const sy = from.height > 0 ? to.height / from.height : 1;
  return { sx, sy, tx: to.x - from.x * sx, ty: to.y - from.y * sy };
}

function px(value: string | undefined): number | null {
  if (value === undefined) return null;
  const match = /^(-?\d*\.?\d+)(px)?$/.exec(value.trim());
  return match ? Number(match[1]) : null;
}

function placedBox(svg: VNode): VectorBox {
  const left = px(svg.style.left);
  const top = px(svg.style.top);
  if (left === null || top === null) throw refuse('The two SVGs are not placed with left and top, so the studio cannot line them up. Select them on the canvas, or pass rects');
  const view = viewBoxOf(svg);
  return { x: left, y: top, width: num(svg, 'width', view.width), height: num(svg, 'height', view.height) };
}

function mapOf(operand: Operand, rect: VectorBox | undefined): Map2 {
  if (!rect) return fit(viewBoxOf(operand.svg), placedBox(operand.svg));
  if (operand.node === operand.svg || operand.node.tag === 'svg') return fit(viewBoxOf(operand.svg), rect);
  const box = boxOfPoints(allPoints(operand.region));
  return box ? stretch(box, rect) : fit(viewBoxOf(operand.svg), rect);
}

function apply(region: MultiPolygon, map: Map2): MultiPolygon {
  return region.map((polygon) => polygon.map((ring) => ring.map(([x, y]): Pair => [x * map.sx + map.tx, y * map.sy + map.ty])));
}

function maps(a: Operand, b: Operand, rects: [VectorBox, VectorBox] | undefined): [Map2, Map2] {
  const same = a.svg.start === b.svg.start;
  if (same) {
    const identity = { sx: 1, sy: 1, tx: 0, ty: 0 };
    return [identity, identity];
  }
  return [mapOf(a, rects?.[0]), mapOf(b, rects?.[1])];
}

function paintOf(operand: Operand): Record<string, string | undefined> {
  const first = operand.shapes[0] as VNode;
  const fill = first.attrs.fill ?? first.style.fill ?? operand.svg.attrs.fill;
  const stroke = first.attrs.stroke ?? first.style.stroke;
  const filled = fill !== undefined && fill !== 'none';
  return { fill: filled ? fill : stroke ? 'none' : DEFAULT_SHAPE_FILL, stroke, 'stroke-width': first.attrs['stroke-width'] };
}

function lineStartOf(code: string, offset: number): number {
  return code.lastIndexOf('\n', offset - 1) + 1;
}

function removal(code: string, node: VNode): Splice {
  const lineStart = lineStartOf(code, node.start);
  const lead = code.slice(lineStart, node.start);
  const after = /^[ \t]*\r?\n/.exec(code.slice(node.end));
  if (/^[ \t]*$/.test(lead) && after) return { start: lineStart, end: node.end + after[0].length, text: '' };
  return { start: node.start, end: node.end, text: '' };
}

function removedNode(a: Operand, b: Operand): VNode {
  if (b.node.tag !== 'svg' && b.svg.start === a.svg.start) return b.node;
  if (b.node.tag !== 'svg' && shapesIn(b.svg).length > b.shapes.length) return b.node;
  return b.svg;
}

function slotSplice(code: string, a: Operand, path: string, open: Splice | null): { splice: Splice; offset: number; extra: Splice | null } {
  if (a.node.tag !== 'svg') return { splice: { start: a.node.start, end: a.node.end, text: path }, offset: 0, extra: null };
  const inner = a.svg.inner;
  if (!inner) throw refuse('The first SVG has no closing tag');
  const indent = /^[ \t]*/.exec(code.slice(lineStartOf(code, a.svg.start)))?.[0] ?? '';
  const lead = `\n${indent}  `;
  const extra = open ?? (a.svg.attrs.overflow ? null : { start: a.svg.start + 4, end: a.svg.start + 4, text: ' overflow="visible"' });
  return { splice: { start: inner.start, end: inner.end, text: `${lead}${path}\n${indent}` }, offset: lead.length, extra };
}

interface Rebox {
  box: Box;
  open: Splice;
}

function setAttr(tag: string, name: string, value: number | string): string {
  const pattern = new RegExp(`(\\s${name}=)("[^"]*"|\\{[^}]*\\})`, 'i');
  return pattern.test(tag) ? tag.replace(pattern, `$1"${value}"`) : tag.replace(/^<svg/, `<svg ${name}="${value}"`);
}

function setPlace(tag: string, name: 'left' | 'top', value: number): string {
  return tag.replace(new RegExp(`(\\b${name}:\\s*['"]?)(-?\\d*\\.?\\d+)`), `$1${value}`);
}

function reboxOf(code: string, a: Operand, sameSvg: boolean, target: VectorBox, result: MultiPolygon): Rebox | null {
  if (sameSvg || a.node.tag !== 'svg' || a.svg.dynamic.length > 0) return null;
  const left = px(a.svg.style.left);
  const top = px(a.svg.style.top);
  const box = boxOfPoints(allPoints(result));
  if (left === null || top === null || !box) return null;
  const width = round(box.width);
  const height = round(box.height);
  let tag = code.slice(a.svg.start, a.svg.openEnd);
  tag = setAttr(setAttr(setAttr(tag, 'width', width), 'height', height), 'viewBox', `0 0 ${width} ${height}`);
  tag = setPlace(setPlace(tag, 'left', round(left + box.x - target.x)), 'top', round(top + box.y - target.y));
  return { box, open: { start: a.svg.start, end: a.svg.openEnd, text: tag } };
}

function overlaps(x: Splice, y: Splice): boolean {
  return x.start < y.end && y.start < x.end;
}

export function planBoolean(code: string, doc: VectorDoc, nodes: [VNode, VNode], op: BooleanOpName, rects?: [VectorBox, VectorBox]): BooleanPlan {
  const a = operandOf(doc, nodes[0]);
  const b = operandOf(doc, nodes[1]);
  if (a.node.start === b.node.start) throw refuse('Select two different shapes');
  if ((a.node.start <= b.node.start && a.node.end >= b.node.end) || (b.node.start <= a.node.start && b.node.end >= a.node.end)) throw refuse('One selection is inside the other. Select two separate shapes');
  const [mapA, mapB] = maps(a, b, rects);
  const result = combine(op, apply(a.region, mapA), apply(b.region, mapB));
  if (result.length === 0) throw refuse(`The ${op} of these shapes is empty`);
  const sameSvg = a.svg.start === b.svg.start;
  const rebox = sameSvg ? null : reboxOf(code, a, sameSvg, rects?.[0] ?? placedBox(a.svg), result);
  const back = rebox ? ([x, y]: Pair): Pair => [x - rebox.box.x, y - rebox.box.y] : ([x, y]: Pair): Pair => [(x - mapA.tx) / mapA.sx, (y - mapA.ty) / mapA.sy];
  const d = regionPath(result, back);
  const path = elementText('path', { 'data-name': NAMES[op], d, 'fill-rule': 'evenodd', ...paintOf(a) }, doc.html);
  const slot = slotSplice(code, a, path, rebox?.open ?? null);
  const remove = removal(code, removedNode(a, b));
  if (overlaps(remove, slot.splice) || (slot.extra && overlaps(remove, slot.extra))) throw refuse('These two shapes overlap in the source. Select two separate shapes');
  const splices = [slot.splice, remove, ...(slot.extra ? [slot.extra] : [])];
  const before = splices.filter((splice) => splice !== slot.splice && splice.start <= slot.splice.start).reduce((sum, splice) => sum + splice.text.length - (splice.end - splice.start), 0);
  const out = applySplices(code, splices);
  return { code: out, at: positionAt(out, slot.splice.start + before + slot.offset), title: `${NAMES[op]} 2 shapes` };
}
