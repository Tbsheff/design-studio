import type { CommentDrawing, DrawStroke } from '../shared/contracts';

export const DRAW_COLORS = [
  { id: 'red', label: 'Red', value: '#ff3b30' },
  { id: 'blue', label: 'Blue', value: '#0a84ff' },
  { id: 'green', label: 'Green', value: '#1fae4c' },
  { id: 'ink', label: 'Black', value: '#1c1c1e' },
] as const;

export const DRAW_SCREEN_WIDTH = 3;
const SMOOTHING = 0.45;
const MIN_STEP_SCREEN = 1.5;
const PNG_MAX_SIDE = 4096;
const HALO = 'rgba(255, 255, 255, 0.9)';

export interface StrokeBuilder {
  add(x: number, y: number): boolean;
  end(x: number, y: number): void;
  points(): number[];
}

export function createStrokeBuilder(x: number, y: number, minStep: number): StrokeBuilder {
  const points = [round(x), round(y)];
  let lastX = x;
  let lastY = y;
  return {
    add(rawX, rawY) {
      const nextX = lastX + (rawX - lastX) * (1 - SMOOTHING);
      const nextY = lastY + (rawY - lastY) * (1 - SMOOTHING);
      if (Math.hypot(nextX - lastX, nextY - lastY) < minStep) return false;
      lastX = nextX;
      lastY = nextY;
      points.push(round(nextX), round(nextY));
      return true;
    },
    end(rawX, rawY) {
      if (points.length >= 4 && Math.hypot(rawX - lastX, rawY - lastY) < minStep / 2) return;
      lastX = rawX;
      lastY = rawY;
      points.push(round(rawX), round(rawY));
    },
    points: () => points,
  };
}

export function minStepFor(zoom: number): number {
  return MIN_STEP_SCREEN / Math.max(zoom, 0.05);
}

function round(value: number): number {
  return Math.round(value * 10) / 10;
}

export function strokePath(points: number[]): string {
  const count = points.length / 2;
  if (count === 0) return '';
  const x0 = points[0] as number;
  const y0 = points[1] as number;
  if (count === 1) return `M${x0} ${y0}l0.01 0`;
  let path = `M${x0} ${y0}`;
  for (let i = 1; i < count - 1; i += 1) {
    const x = points[i * 2] as number;
    const y = points[i * 2 + 1] as number;
    const mx = (x + (points[i * 2 + 2] as number)) / 2;
    const my = (y + (points[i * 2 + 3] as number)) / 2;
    path += `Q${x} ${y} ${round(mx)} ${round(my)}`;
  }
  return `${path}L${points[(count - 1) * 2]} ${points[(count - 1) * 2 + 1]}`;
}

function traceStroke(ctx: CanvasRenderingContext2D, points: number[]): void {
  const count = points.length / 2;
  const x0 = points[0] as number;
  const y0 = points[1] as number;
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  if (count === 1) ctx.lineTo(x0 + 0.01, y0);
  for (let i = 1; i < count - 1; i += 1) {
    const x = points[i * 2] as number;
    const y = points[i * 2 + 1] as number;
    ctx.quadraticCurveTo(x, y, (x + (points[i * 2 + 2] as number)) / 2, (y + (points[i * 2 + 3] as number)) / 2);
  }
  if (count > 1) ctx.lineTo(points[(count - 1) * 2] as number, points[(count - 1) * 2 + 1] as number);
}

export function paintStrokes(ctx: CanvasRenderingContext2D, strokes: DrawStroke[], halo: boolean): void {
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (const stroke of strokes) {
    if (stroke.points.length < 2) continue;
    traceStroke(ctx, stroke.points);
    if (halo) {
      ctx.strokeStyle = HALO;
      ctx.lineWidth = stroke.width + 3;
      ctx.stroke();
    }
    ctx.strokeStyle = stroke.color;
    ctx.lineWidth = stroke.width;
    ctx.stroke();
  }
}

export function renderDrawingPng(drawing: CommentDrawing): Promise<Blob> {
  const { width, height } = drawing.frame;
  const scale = Math.min(1, PNG_MAX_SIDE / Math.max(width, height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(width * scale));
  canvas.height = Math.max(1, Math.round(height * scale));
  const ctx = canvas.getContext('2d');
  if (!ctx) return Promise.reject(new Error('Canvas is not available'));
  ctx.scale(scale, scale);
  paintStrokes(ctx, drawing.strokes, true);
  return new Promise((resolve, reject) => canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Could not make the drawing image'))), 'image/png'));
}
