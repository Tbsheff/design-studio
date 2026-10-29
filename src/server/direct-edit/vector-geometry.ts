import polygonClipping, { type MultiPolygon, type Pair, type Ring } from 'polygon-clipping';
import { DirectEditError } from './errors.js';

export type Point = { x: number; y: number };
export type Box = { x: number; y: number; width: number; height: number };
export type BooleanOp = 'union' | 'subtract' | 'intersect' | 'exclude';

const CURVE_STEPS = 16;
const ARGS: Record<string, number> = { m: 2, l: 2, h: 1, v: 1, c: 6, s: 4, q: 4, t: 2, a: 7, z: 0 };
const TOKEN = /([MmLlHhVvCcSsQqTtAaZz])|([-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?)/g;

function badPath(): DirectEditError {
  return new DirectEditError('invalid_request', 'The path data (d) is not valid SVG path data');
}

function tokens(d: string): (string | number)[] {
  const out: (string | number)[] = [];
  for (const match of d.matchAll(TOKEN)) out.push(match[1] ?? Number(match[2]));
  return out;
}

interface Pen {
  rings: Pair[][];
  ring: Pair[];
  x: number;
  y: number;
  startX: number;
  startY: number;
  cx: number;
  cy: number;
  last: string;
}

function lineTo(pen: Pen, x: number, y: number): void {
  pen.ring.push([x, y]);
  pen.x = x;
  pen.y = y;
}

function cubic(pen: Pen, c1: Point, c2: Point, end: Point): void {
  const { x: x0, y: y0 } = pen;
  for (let i = 1; i <= CURVE_STEPS; i += 1) {
    const t = i / CURVE_STEPS;
    const u = 1 - t;
    const x = u * u * u * x0 + 3 * u * u * t * c1.x + 3 * u * t * t * c2.x + t * t * t * end.x;
    const y = u * u * u * y0 + 3 * u * u * t * c1.y + 3 * u * t * t * c2.y + t * t * t * end.y;
    pen.ring.push([x, y]);
  }
  pen.x = end.x;
  pen.y = end.y;
  pen.cx = c2.x;
  pen.cy = c2.y;
}

function quad(pen: Pen, c: Point, end: Point): void {
  const { x: x0, y: y0 } = pen;
  for (let i = 1; i <= CURVE_STEPS; i += 1) {
    const t = i / CURVE_STEPS;
    const u = 1 - t;
    pen.ring.push([u * u * x0 + 2 * u * t * c.x + t * t * end.x, u * u * y0 + 2 * u * t * c.y + t * t * end.y]);
  }
  pen.x = end.x;
  pen.y = end.y;
  pen.cx = c.x;
  pen.cy = c.y;
}

function angle(ux: number, uy: number, vx: number, vy: number): number {
  const sign = ux * vy - uy * vx < 0 ? -1 : 1;
  const dot = (ux * vx + uy * vy) / (Math.hypot(ux, uy) * Math.hypot(vx, vy) || 1);
  return sign * Math.acos(Math.max(-1, Math.min(1, dot)));
}

function arc(pen: Pen, a: number[], end: Point): void {
  let [rx, ry] = [Math.abs(a[0] as number), Math.abs(a[1] as number)];
  const phi = (((a[2] as number) % 360) * Math.PI) / 180;
  const large = a[3] !== 0;
  const sweep = a[4] !== 0;
  if (rx === 0 || ry === 0) return lineTo(pen, end.x, end.y);
  const cos = Math.cos(phi);
  const sin = Math.sin(phi);
  const dx = (pen.x - end.x) / 2;
  const dy = (pen.y - end.y) / 2;
  const x1 = cos * dx + sin * dy;
  const y1 = -sin * dx + cos * dy;
  const lambda = (x1 * x1) / (rx * rx) + (y1 * y1) / (ry * ry);
  if (lambda > 1) {
    rx *= Math.sqrt(lambda);
    ry *= Math.sqrt(lambda);
  }
  const num = rx * rx * ry * ry - rx * rx * y1 * y1 - ry * ry * x1 * x1;
  const den = rx * rx * y1 * y1 + ry * ry * x1 * x1;
  const factor = (large === sweep ? -1 : 1) * Math.sqrt(Math.max(0, num / (den || 1)));
  const cxp = (factor * rx * y1) / ry;
  const cyp = (-factor * ry * x1) / rx;
  const cx = cos * cxp - sin * cyp + (pen.x + end.x) / 2;
  const cy = sin * cxp + cos * cyp + (pen.y + end.y) / 2;
  const start = angle(1, 0, (x1 - cxp) / rx, (y1 - cyp) / ry);
  let delta = angle((x1 - cxp) / rx, (y1 - cyp) / ry, (-x1 - cxp) / rx, (-y1 - cyp) / ry);
  if (!sweep && delta > 0) delta -= 2 * Math.PI;
  if (sweep && delta < 0) delta += 2 * Math.PI;
  const steps = Math.max(4, Math.ceil((Math.abs(delta) / (Math.PI / 2)) * (CURVE_STEPS / 2)));
  for (let i = 1; i <= steps; i += 1) {
    const t = start + (delta * i) / steps;
    const px = rx * Math.cos(t);
    const py = ry * Math.sin(t);
    pen.ring.push([cos * px - sin * py + cx, sin * px + cos * py + cy]);
  }
  pen.x = end.x;
  pen.y = end.y;
}

function closeRing(pen: Pen): void {
  if (pen.ring.length > 2) pen.rings.push(pen.ring);
  pen.ring = [];
  pen.x = pen.startX;
  pen.y = pen.startY;
}

function moveTo(pen: Pen, x: number, y: number): void {
  if (pen.ring.length > 0) closeRing(pen);
  pen.ring = [[x, y]];
  pen.x = pen.startX = x;
  pen.y = pen.startY = y;
}

function reflect(pen: Pen, curves: string): Point {
  return curves.includes(pen.last.toLowerCase()) ? { x: 2 * pen.x - pen.cx, y: 2 * pen.y - pen.cy } : { x: pen.x, y: pen.y };
}

function step(pen: Pen, command: string, a: number[]): void {
  const rel = command === command.toLowerCase();
  const ox = rel ? pen.x : 0;
  const oy = rel ? pen.y : 0;
  const at = (i: number): Point => ({ x: (a[i] as number) + ox, y: (a[i + 1] as number) + oy });
  const kind = command.toLowerCase();
  if (kind !== 'm' && pen.ring.length === 0) pen.ring.push([pen.x, pen.y]);
  if (kind === 'm') moveTo(pen, at(0).x, at(0).y);
  else if (kind === 'l') lineTo(pen, at(0).x, at(0).y);
  else if (kind === 'h') lineTo(pen, (a[0] as number) + ox, pen.y);
  else if (kind === 'v') lineTo(pen, pen.x, (a[0] as number) + oy);
  else if (kind === 'c') cubic(pen, at(0), at(2), at(4));
  else if (kind === 's') cubic(pen, reflect(pen, 'cs'), at(0), at(2));
  else if (kind === 'q') quad(pen, at(0), at(2));
  else if (kind === 't') quad(pen, reflect(pen, 'qt'), at(0));
  else if (kind === 'a') arc(pen, a, at(5));
  if (kind !== 'c' && kind !== 's' && kind !== 'q' && kind !== 't') {
    pen.cx = pen.x;
    pen.cy = pen.y;
  }
  pen.last = command;
}

export function pathRings(d: string): Pair[][] {
  const list = tokens(d);
  const pen: Pen = { rings: [], ring: [], x: 0, y: 0, startX: 0, startY: 0, cx: 0, cy: 0, last: '' };
  let command = '';
  let index = 0;
  while (index < list.length) {
    const head = list[index];
    if (typeof head === 'string') {
      command = head;
      index += 1;
      if (command.toLowerCase() === 'z') {
        closeRing(pen);
        pen.last = command;
        continue;
      }
    } else if (!command || command.toLowerCase() === 'z') throw badPath();
    const count = ARGS[command.toLowerCase()] as number;
    const args = list.slice(index, index + count);
    if (args.length < count || args.some((value) => typeof value !== 'number')) throw badPath();
    step(pen, command, args as number[]);
    index += count;
    if (command === 'M') command = 'L';
    else if (command === 'm') command = 'l';
  }
  if (pen.ring.length > 0) closeRing(pen);
  return pen.rings;
}

export function ellipseRing(cx: number, cy: number, rx: number, ry: number): Pair[] {
  const steps = CURVE_STEPS * 4;
  const ring: Pair[] = [];
  for (let i = 0; i < steps; i += 1) {
    const t = (2 * Math.PI * i) / steps;
    ring.push([cx + rx * Math.cos(t), cy + ry * Math.sin(t)]);
  }
  return ring;
}

export function rectRing(x: number, y: number, width: number, height: number, radius: number): Pair[] {
  const r = Math.max(0, Math.min(radius, width / 2, height / 2));
  if (r === 0) return [[x, y], [x + width, y], [x + width, y + height], [x, y + height]];
  const ring: Pair[] = [];
  const corners: [number, number, number][] = [[x + width - r, y + r, -Math.PI / 2], [x + width - r, y + height - r, 0], [x + r, y + height - r, Math.PI / 2], [x + r, y + r, Math.PI]];
  for (const [cx, cy, from] of corners) for (let i = 0; i <= CURVE_STEPS / 2; i += 1) {
    const t = from + (Math.PI / 2) * (i / (CURVE_STEPS / 2));
    ring.push([cx + r * Math.cos(t), cy + r * Math.sin(t)]);
  }
  return ring;
}

export function closeOf(ring: Pair[]): Ring {
  const first = ring[0] as Pair;
  const last = ring[ring.length - 1] as Pair;
  return first[0] === last[0] && first[1] === last[1] ? ring : [...ring, first];
}

export function regionOf(rings: Pair[][]): MultiPolygon {
  const polygons = rings.filter((ring) => ring.length > 2).map((ring) => [closeOf(ring)]);
  if (polygons.length === 0) return [];
  const [first, ...rest] = polygons;
  return rest.length === 0 ? [first as Ring[]] : polygonClipping.xor(first as Ring[], ...rest);
}

export function combine(op: BooleanOp, a: MultiPolygon, b: MultiPolygon): MultiPolygon {
  if (op === 'union') return polygonClipping.union(a, b);
  if (op === 'subtract') return polygonClipping.difference(a, b);
  if (op === 'intersect') return polygonClipping.intersection(a, b);
  return polygonClipping.xor(a, b);
}

export function boxOfPoints(points: Iterable<Pair>): Box | null {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const [x, y] of points) {
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  }
  return Number.isFinite(minX) ? { x: minX, y: minY, width: maxX - minX, height: maxY - minY } : null;
}

export function* allPoints(region: MultiPolygon | Pair[][]): Generator<Pair> {
  for (const item of region) for (const entry of item) {
    if (typeof entry[0] === 'number') yield entry as Pair;
    else for (const point of entry as Ring) yield point;
  }
}

export function round(value: number): number {
  return Math.round(value * 100) / 100;
}

export function regionPath(region: MultiPolygon, map: (pair: Pair) => Pair = (pair) => pair): string {
  const parts: string[] = [];
  for (const polygon of region) for (const ring of polygon) {
    const points = ring.slice(0, -1).map(map);
    if (points.length < 3) continue;
    parts.push(`M${points.map(([x, y]) => `${round(x)} ${round(y)}`).join('L')}Z`);
  }
  return parts.join('');
}

export function mapRings(rings: Pair[][], map: (pair: Pair) => Pair): Pair[][] {
  return rings.map((ring) => ring.map(map));
}

export function translatePath(d: string, dx: number, dy: number): string {
  const list = tokens(d);
  let command = '';
  let argIndex = 0;
  const out: string[] = [];
  for (const item of list) {
    if (typeof item === 'string') {
      command = item;
      argIndex = 0;
      out.push(item);
      continue;
    }
    out.push(String(round(item + shiftFor(command, argIndex, dx, dy))));
    argIndex += 1;
  }
  return out.join(' ').replace(/ ([MmLlHhVvCcSsQqTtAaZz]) /g, '$1').replace(/^([MmLlHhVvCcSsQqTtAaZz]) /, '$1');
}

function shiftFor(command: string, index: number, dx: number, dy: number): number {
  if (command !== command.toUpperCase() || command === 'Z') return 0;
  const kind = command.toLowerCase();
  if (kind === 'h') return dx;
  if (kind === 'v') return dy;
  const count = ARGS[kind] as number;
  const i = index % count;
  if (kind === 'a') return i === 5 ? dx : i === 6 ? dy : 0;
  return i % 2 === 0 ? dx : dy;
}
