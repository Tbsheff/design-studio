import type { SourceLoc, Version } from './contracts.js';
import type { InsertTarget } from './insert.js';

export const VECTOR_SHAPES = ['rect', 'ellipse'] as const;
export type VectorToolId = 'rect' | 'ellipse' | 'pen';

export function vectorToolKeyOf(event: Pick<KeyboardEvent, 'key' | 'shiftKey' | 'metaKey' | 'ctrlKey' | 'altKey' | 'repeat'>): VectorToolId | null {
  if (event.metaKey || event.ctrlKey || event.altKey || event.repeat) return null;
  if (event.key === 'P' && event.shiftKey) return 'pen';
  if (event.shiftKey) return null;
  const key = event.key.toLowerCase();
  return key === 'r' ? 'rect' : key === 'o' ? 'ellipse' : null;
}
export type VectorShape = (typeof VECTOR_SHAPES)[number];

export const BOOLEAN_OPS = ['union', 'subtract', 'intersect', 'exclude'] as const;
export type BooleanOpName = (typeof BOOLEAN_OPS)[number];

export const SVG_SHAPE_TAGS = ['svg', 'path', 'rect', 'circle', 'ellipse', 'polygon', 'polyline', 'line', 'g'] as const;
export const VECTOR_PATH_MAX = 20000;
export const VECTOR_COLOR = /^(?:#[0-9a-fA-F]{3,8}|[a-zA-Z]{3,30}|(?:rgb|rgba|hsl|hsla|oklch|oklab)\([^()]{1,80}\)|var\(--[\w-]{1,60}\))$/;
export const DEFAULT_SHAPE_FILL = '#D9D9D9';
export const DEFAULT_PEN_STROKE = '#1E1E1E';

export interface VectorBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface VectorPaint {
  fill?: string | null;
  stroke?: string | null;
  strokeWidth?: number | null;
}

interface PlaceFields {
  target: InsertTarget;
  relativeParent?: boolean;
  page?: string;
}

export type VectorRequest =
  | ({ op: 'shape'; shape: VectorShape; box: VectorBox } & PlaceFields & VectorPaint)
  | ({ op: 'path'; d: string; name?: string } & PlaceFields & VectorPaint)
  | { op: 'boolean'; boolean: BooleanOpName; targets: [InsertTarget, InsertTarget]; rects?: [VectorBox, VectorBox] }
  | ({ op: 'paint'; target: InsertTarget } & VectorPaint);

export interface VectorResult {
  file: string;
  version: Version | null;
  select: (SourceLoc & { tag: string })[];
  title: string;
}

export function isSvgShapeTag(tag: string | undefined): boolean {
  return tag !== undefined && (SVG_SHAPE_TAGS as readonly string[]).includes(tag.toLowerCase());
}
