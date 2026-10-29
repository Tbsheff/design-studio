import type { ScanBox, ScanClip, ScanColor, ScanItem, ScanRect, ScanResult, ScanShape, ScanSvg } from './page-scan.js';
import { parsePath, type PathPoint } from './svg-path.js';

export interface NativeStroke {
  color: ScanColor;
  width: number;
  dashed: boolean;
}

interface Painted {
  fill: ScanColor | null;
  stroke: NativeStroke | null;
  opacity: number;
}

export type NativeShape =
  | (Painted & { kind: 'rect'; box: ScanRect; radius: number })
  | (Painted & { kind: 'ellipse'; box: ScanRect })
  | (Painted & { kind: 'path'; box: ScanRect; points: PathPoint[] })
  | { kind: 'line'; x1: number; y1: number; x2: number; y2: number; stroke: NativeStroke; opacity: number }
  | { kind: 'image'; box: ScanRect };

export interface NativePlan {
  shapes: NativeShape[];
  paint: number[];
  gone: number[];
}

const THIN = 3;
const EPS = 0.5;

function overlaps(a: ScanRect, b: ScanRect): boolean {
  return a.x < b.x + b.width - EPS && b.x < a.x + a.width - EPS && a.y < b.y + b.height - EPS && b.y < a.y + a.height - EPS;
}

function inside(box: ScanRect, area: ScanRect, slack = EPS): boolean {
  return box.x >= area.x - slack && box.y >= area.y - slack && box.x + box.width <= area.x + area.width + slack && box.y + box.height <= area.y + area.height + slack;
}

function reach(item: ScanBox | ScanSvg): ScanRect {
  if (item.kind !== 'box' || !item.shadow) return item;
  const { dx, dy, blur } = item.shadow;
  return { x: item.x + Math.min(0, dx) - blur, y: item.y + Math.min(0, dy) - blur, width: item.width + Math.abs(dx) + blur * 2, height: item.height + Math.abs(dy) + blur * 2 };
}

function sameColor(colors: ScanColor[]): ScanColor | null {
  const [first] = colors;
  if (!first || colors.some((c) => c.hex !== first.hex || Math.abs(c.alpha - first.alpha) > 0.01)) return null;
  return first;
}

function lineIn(rect: ScanRect, color: ScanColor, opacity: number, dashed = false): NativeShape {
  const across = rect.width >= rect.height;
  const width = across ? rect.height : rect.width;
  const stroke = { color, width, dashed };
  if (across) return { kind: 'line', x1: rect.x, y1: rect.y + width / 2, x2: rect.x + rect.width, y2: rect.y + width / 2, stroke, opacity };
  return { kind: 'line', x1: rect.x + width / 2, y1: rect.y, x2: rect.x + width / 2, y2: rect.y + rect.height, stroke, opacity };
}

function thinLine(box: ScanBox): NativeShape | null {
  if (Math.min(box.width, box.height) > THIN) return null;
  const colors = [box.fill, box.border?.color, ...box.sides.map((side) => side.color)].filter((c): c is ScanColor => Boolean(c));
  const color = sameColor(colors);
  return color ? lineIn(box, color, box.opacity, box.border?.dashed) : null;
}

function sideShape(side: ScanRect & { color: ScanColor }, opacity: number): NativeShape {
  if (Math.min(side.width, side.height) <= THIN) return lineIn(side, side.color, opacity);
  return { kind: 'rect', box: side, radius: 0, fill: side.color, stroke: null, opacity };
}

function boxShapes(box: ScanBox): NativeShape[] | null {
  const [r = 0] = box.radius;
  if (box.shadow || box.radius.some((v) => Math.abs(v - r) > EPS)) return null;
  if (r <= EPS) {
    const thin = thinLine(box);
    if (thin) return [thin];
  }
  const fill: NativeShape[] = box.fill ? [{ kind: 'rect', box, radius: r, fill: box.fill, stroke: null, opacity: box.opacity }] : [];
  if (box.sides.length > 0) return r > EPS ? null : [...fill, ...box.sides.map((side) => sideShape(side, box.opacity))];
  if (!box.border) return fill.length > 0 ? boxShape(box, r, null) : null;
  return boxShape(box, r, { color: box.border.color, width: box.border.width, dashed: box.border.dashed });
}

function boxShape(box: ScanBox, r: number, stroke: NativeStroke | null): NativeShape[] {
  const inset = stroke ? stroke.width / 2 : 0;
  const rect = { x: box.x + inset, y: box.y + inset, width: Math.max(0, box.width - inset * 2), height: Math.max(0, box.height - inset * 2) };
  const painted = { fill: box.fill, stroke, opacity: box.opacity };
  const round = r >= Math.min(box.width, box.height) / 2 - EPS;
  if (round && Math.abs(box.width - box.height) < EPS) return [{ kind: 'ellipse', box: rect, ...painted }];
  return [{ kind: 'rect', box: rect, radius: Math.max(0, r - inset), ...painted }];
}

function imageShapes(box: ScanBox, later: ScanRect[]): NativeShape[] | null {
  if (box.border || box.sides.length > 0 || box.shadow || box.radius.some((r) => r > EPS)) return null;
  return later.some((rect) => overlaps(rect, box)) ? null : [{ kind: 'image', box }];
}

function pathBox(points: PathPoint[]): ScanRect {
  const xs: number[] = [];
  const ys: number[] = [];
  for (const point of points) {
    if ('close' in point) continue;
    xs.push(point.x);
    ys.push(point.y);
    if (!('curve' in point)) continue;
    xs.push(point.curve.x1);
    ys.push(point.curve.y1);
    if (point.curve.type === 'cubic') {
      xs.push(point.curve.x2);
      ys.push(point.curve.y2);
    }
  }
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  return { x, y, width: Math.max(...xs) - x, height: Math.max(...ys) - y };
}

function svgShape(shape: ScanShape, base: number): NativeShape | null {
  const stroke = shape.stroke ? { color: shape.stroke, width: shape.strokeWidth, dashed: false } : null;
  const painted = { fill: shape.fill, stroke, opacity: base * shape.opacity };
  if (shape.kind === 'rect') return { kind: 'rect', box: shape, radius: shape.radius, ...painted };
  if (shape.kind === 'ellipse') return { kind: 'ellipse', box: shape, ...painted };
  if (shape.kind === 'line') return stroke ? { kind: 'line', x1: shape.x1, y1: shape.y1, x2: shape.x2, y2: shape.y2, stroke, opacity: painted.opacity } : null;
  const points = parsePath(shape.d, shape.matrix);
  return points ? { kind: 'path', box: pathBox(points), points, ...painted } : null;
}

function boundsOf(shape: NativeShape): ScanRect {
  if (shape.kind === 'image') return shape.box;
  const half = (shape.stroke?.width ?? 0) / 2;
  const box = shape.kind === 'line' ? { x: Math.min(shape.x1, shape.x2), y: Math.min(shape.y1, shape.y2), width: Math.abs(shape.x2 - shape.x1), height: Math.abs(shape.y2 - shape.y1) } : shape.box;
  return { x: box.x - half, y: box.y - half, width: box.width + half * 2, height: box.height + half * 2 };
}

function svgShapes(item: ScanSvg): NativeShape[] | null {
  if (!item.shapes) return null;
  const out: NativeShape[] = [];
  for (const shape of item.shapes) {
    const native = svgShape(shape, item.opacity);
    if (!native || !inside(boundsOf(native), item, 1)) return null;
    out.push(native);
  }
  return out;
}

function clipOk(box: ScanRect, radius: number, clip: ScanClip | undefined): boolean {
  if (!clip) return true;
  if (!inside(box, clip)) return false;
  if (clip.radius <= EPS || radius >= clip.radius - EPS) return true;
  const near = clip.radius * 0.3;
  const left = box.x - clip.x < near;
  const right = clip.x + clip.width - (box.x + box.width) < near;
  const top = box.y - clip.y < near;
  const bottom = clip.y + clip.height - (box.y + box.height) < near;
  return !((left || right) && (top || bottom));
}

function inRegion(item: ScanBox | ScanSvg, scan: ScanResult): boolean {
  return inside(item, { x: 0, y: 0, width: scan.width, height: scan.height }, 1);
}

function clipToRegion(box: ScanBox, scan: ScanResult): ScanBox | null {
  if (inRegion(box, scan)) return box;
  if (box.border || box.sides.length > 0 || box.radius.some((r) => r > EPS) || !box.fill) return null;
  const x = Math.max(0, box.x);
  const y = Math.max(0, box.y);
  return { ...box, x, y, width: Math.min(scan.width, box.x + box.width) - x, height: Math.min(scan.height, box.y + box.height) - y };
}

function convert(item: ScanBox | ScanSvg, scan: ScanResult, later: ScanRect[]): NativeShape[] | null {
  if (item.id === undefined || !clipOk(item, item.kind === 'box' ? (item.radius[0] ?? 0) : 0, scan.clips[item.clip])) return null;
  if (item.kind === 'svg') return inRegion(item, scan) ? svgShapes(item) : null;
  if (item.complex) return null;
  if (item.image) return inRegion(item, scan) ? imageShapes(item, later) : null;
  if (item.raster) return null;
  const box = clipToRegion(item, scan);
  return box ? boxShapes(box) : null;
}

function drawn(item: ScanItem): item is ScanBox | ScanSvg {
  return item.kind !== 'text';
}

export function planNative(scan: ScanResult): NativePlan {
  const layers: NativeShape[][] = [];
  const raster: ScanRect[] = [];
  const later: ScanRect[] = [];
  const plan: NativePlan = { shapes: [], paint: [], gone: [] };
  for (const item of [...scan.items].reverse().filter(drawn)) {
    const rect = reach(item);
    const shapes = raster.some((other) => overlaps(other, rect)) ? null : convert(item, scan, later);
    later.push(rect);
    if (!shapes || item.id === undefined) {
      raster.push(rect);
      continue;
    }
    layers.push(shapes);
    if (item.kind === 'svg' || item.image) plan.gone.push(item.id);
    else plan.paint.push(item.id);
  }
  plan.shapes = layers.reverse().flat();
  return plan;
}
