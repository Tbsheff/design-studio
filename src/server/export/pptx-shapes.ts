import type PptxGenJS from 'pptxgenjs';
import { PNG } from 'pngjs';
import type { ScanColor } from './page-scan.js';
import type { NativeShape, NativeStroke } from './pptx-plan.js';
import type { PathPoint } from './svg-path.js';
import { cropPng, type VectorRegion } from './vector.js';

type Slide = ReturnType<PptxGenJS['addSlide']>;
type Points = NonNullable<PptxGenJS.ShapeProps['points']>;

const PX_PER_IN = 96;
const PT_PER_PX = 0.75;
const r2 = (value: number): number => Math.round(value * 100) / 100;

export interface ShapeCount {
  shapes: number;
  pictures: number;
}

class ShapeWriter {
  private source: PNG | null = null;
  readonly count: ShapeCount = { shapes: 0, pictures: 0 };

  constructor(
    private readonly slide: Slide,
    private readonly region: VectorRegion,
    private readonly k: number,
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

  private frame(box: { x: number; y: number; width: number; height: number }): { x: number; y: number; w: number; h: number } {
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

  private image(box: { x: number; y: number; width: number; height: number }): void {
    if (!this.region.under) return;
    this.source ??= PNG.sync.read(this.region.under);
    const crop = cropPng(this.source, box, this.region.scale);
    if (!crop) return;
    this.slide.addImage({ data: `image/png;base64,${crop.toString('base64')}`, ...this.frame(box) });
    this.count.pictures += 1;
  }

  add(shape: NativeShape): void {
    if (shape.kind === 'image') return this.image(shape.box);
    this.count.shapes += 1;
    if (shape.kind === 'line') {
      const flip = (shape.x2 - shape.x1) * (shape.y2 - shape.y1) < 0;
      this.slide.addShape('line', { ...this.frame({ x: Math.min(shape.x1, shape.x2), y: Math.min(shape.y1, shape.y2), width: Math.abs(shape.x2 - shape.x1), height: Math.abs(shape.y2 - shape.y1) }), line: this.line(shape.stroke, shape.opacity), ...(flip ? { flipV: true } : {}) });
      return;
    }
    const paint = { fill: this.fill(shape.fill, shape.opacity), line: this.line(shape.stroke, shape.opacity) };
    if (shape.kind === 'path') {
      this.slide.addShape('custGeom' as PptxGenJS.SHAPE_NAME, { ...this.frame(shape.box), ...paint, points: this.points(shape.points, shape.box.x, shape.box.y) });
      return;
    }
    if (shape.kind === 'ellipse') {
      this.slide.addShape('ellipse', { ...this.frame(shape.box), ...paint });
      return;
    }
    const round = shape.radius > 0.5;
    this.slide.addShape(round ? 'roundRect' : 'rect', { ...this.frame(shape.box), ...paint, ...(round ? { rectRadius: this.inch(shape.radius) } : {}) });
  }
}

export function addShapes(slide: Slide, region: VectorRegion, k: number): ShapeCount {
  const writer = new ShapeWriter(slide, region, k);
  for (const shape of region.native?.shapes ?? []) writer.add(shape);
  return writer.count;
}
