import type PptxGenJS from 'pptxgenjs';
import { PNG } from 'pngjs';
import type { ScanColor, ScanRect } from './page-scan.js';
import type { NativeShape, NativeStroke } from './pptx-plan.js';
import { addBlock, type Slide } from './pptx-text.js';
import { gradientXml, roundGeomXml, shadowXml, type XmlPatch } from './pptx-xml.js';
import type { PathPoint } from './svg-path.js';
import { cropPng, type VectorRegion } from './vector.js';

type Points = NonNullable<PptxGenJS.ShapeProps['points']>;
type Filled = Extract<NativeShape, { kind: 'rect' | 'ellipse' | 'path' }>;

const PX_PER_IN = 96;
const PT_PER_PX = 0.75;
const EPS = 0.5;
const r2 = (value: number): number => Math.round(value * 100) / 100;

export interface ShapeCount {
  shapes: number;
  pictures: number;
  texts: number;
}

export class ShapeWriter {
  private source: PNG | null = null;
  readonly count: ShapeCount = { shapes: 0, pictures: 0, texts: 0 };

  constructor(
    private readonly slide: Slide,
    private readonly region: VectorRegion,
    private readonly k: number,
    private readonly patches: Map<string, XmlPatch>,
  ) {}

  private inch(value: number): number {
    return (value * this.k) / PX_PER_IN;
  }

  private fill(color: ScanColor | null, opacity: number): PptxGenJS.ShapeFillProps | undefined {
    if (!color) return undefined;
    const alpha = color.alpha * opacity;
    return { color: color.hex.toUpperCase(), ...(alpha < 0.99 ? { transparency: Math.round((1 - alpha) * 100) } : {}) };
  }

  private line(stroke: NativeStroke | null, opacity: number): PptxGenJS.ShapeLineProps {
    if (!stroke) return { type: 'none' };
    return { ...this.fill(stroke.color, opacity), width: r2(stroke.width * PT_PER_PX * this.k), dashType: stroke.dashed ? 'dash' : 'solid' };
  }

  private frame(box: ScanRect): { x: number; y: number; w: number; h: number } {
    return { x: this.inch(box.x), y: this.inch(box.y), w: this.inch(box.width), h: this.inch(box.height) };
  }

  private points(points: PathPoint[], ox: number, oy: number): Points {
    const x = (value: number): number => this.inch(value - ox);
    const y = (value: number): number => this.inch(value - oy);
    return points.map((point) => {
      if ('close' in point) return point;
      if (!('curve' in point)) return { x: x(point.x), y: y(point.y), ...(point.moveTo ? { moveTo: true } : {}) };
      if (point.curve.type === 'quadratic') return { x: x(point.x), y: y(point.y), curve: { type: 'quadratic', x1: x(point.curve.x1), y1: y(point.curve.y1) } };
      return { x: x(point.x), y: y(point.y), curve: { type: 'cubic', x1: x(point.curve.x1), y1: y(point.curve.y1), x2: x(point.curve.x2), y2: y(point.curve.y2) } };
    }) as Points;
  }

  private name(patch: XmlPatch): { objectName?: string } {
    if (!patch.fill && !patch.effect && !patch.geom) return {};
    const objectName = `ds-${this.patches.size + 1}`;
    this.patches.set(objectName, patch);
    return { objectName };
  }

  private image(box: ScanRect, radius: number): void {
    if (!this.region.under) return;
    this.source ??= PNG.sync.read(this.region.under);
    const crop = cropPng(this.source, box, this.region.scale);
    if (!crop) return;
    const circle = radius >= Math.min(box.width, box.height) / 2 - EPS && Math.abs(box.width - box.height) < 1;
    const patch = radius > EPS && !circle ? { geom: roundGeomXml(radius, box) } : {};
    this.slide.addImage({ data: `image/png;base64,${crop.toString('base64')}`, ...this.frame(box), ...(circle ? { rounding: true } : {}), ...this.name(patch) });
    this.count.pictures += 1;
  }

  private filled(shape: Filled): void {
    const patch: XmlPatch = {
      ...(shape.gradient ? { fill: gradientXml(shape.gradient, shape.opacity) } : {}),
      ...(shape.shadow ? { effect: shadowXml(shape.shadow, shape.box, this.k, shape.opacity) } : {}),
    };
    const first = shape.gradient?.stops[0]?.color ?? shape.fill;
    const props = { ...this.frame(shape.box), fill: this.fill(first, shape.opacity), line: this.line(shape.stroke, shape.opacity), ...this.name(patch) };
    if (shape.kind === 'path') return void this.slide.addShape('custGeom' as PptxGenJS.SHAPE_NAME, { ...props, points: this.points(shape.points, shape.box.x, shape.box.y) });
    if (shape.kind === 'ellipse') return void this.slide.addShape('ellipse', props);
    const round = shape.radius > EPS;
    this.slide.addShape(round ? 'roundRect' : 'rect', { ...props, ...(round ? { rectRadius: this.inch(shape.radius) } : {}) });
  }

  add(shape: NativeShape): void {
    if (shape.kind === 'image') return this.image(shape.box, shape.radius);
    if (shape.kind === 'text') {
      addBlock(this.slide, [{ text: shape.text, line: shape.text.lines[0] ?? { x: 0, y: 0, width: 0, height: 0, text: '', baseline: 0 } }], this.k);
      this.count.texts += 1;
      return;
    }
    this.count.shapes += 1;
    if (shape.kind !== 'line') return this.filled(shape);
    const flip = (shape.x2 - shape.x1) * (shape.y2 - shape.y1) < 0;
    this.slide.addShape('line', { ...this.frame({ x: Math.min(shape.x1, shape.x2), y: Math.min(shape.y1, shape.y2), width: Math.abs(shape.x2 - shape.x1), height: Math.abs(shape.y2 - shape.y1) }), line: this.line(shape.stroke, shape.opacity), ...(flip ? { flipV: true } : {}) });
  }
}
