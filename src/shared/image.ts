import type { SourceLoc, Version } from './contracts.js';
import type { ComponentOwner } from './props.js';

export const IMAGE_BYTES_MAX = 10 * 1024 * 1024;
export const IMAGE_FITS = ['cover', 'contain', 'fill'] as const;
export type ImageFit = (typeof IMAGE_FITS)[number];
export const IMAGE_MODES = ['auto', 'img', 'background', 'insert'] as const;
export type ImageMode = (typeof IMAGE_MODES)[number];
export const IMAGE_ALT_MAX = 500;
export const IMAGE_ACCEPT = 'image/png,image/jpeg,image/gif,image/webp,image/avif,image/svg+xml';

export interface ImageTarget {
  source: SourceLoc | null;
  tag: string;
  selector?: string;
  owners?: ComponentOwner[];
  background?: boolean;
}

export interface SetImageRequest {
  target: ImageTarget;
  mode?: ImageMode;
  image?: { name: string; data: string };
  url?: string;
  fit?: ImageFit;
  focal?: string;
  alt?: string | null;
  position?: 'inside' | 'after';
}

export interface SetImageResult {
  file: string;
  asset: string | null;
  src: string | null;
  mode: Exclude<ImageMode, 'auto'>;
  title: string;
  version: Version | null;
  changed: boolean;
  select?: (SourceLoc & { tag: string })[];
}

export function imageKindOf(selection: { tag: string; styles: Record<string, string> }): 'img' | 'background' | null {
  if (selection.tag.toLowerCase() === 'img') return 'img';
  const background = selection.styles['background-image'] ?? '';
  return /url\(/.test(background) ? 'background' : null;
}

export function focalOf(value: string | undefined): { x: number; y: number } {
  const parts = (value ?? '').trim().split(/\s+/);
  const word: Record<string, number> = { left: 0, top: 0, center: 50, right: 100, bottom: 100 };
  const read = (part: string | undefined): number => {
    if (part === undefined) return 50;
    if (part in word) return word[part] as number;
    const number = Number.parseFloat(part);
    return part.endsWith('%') && Number.isFinite(number) ? Math.min(100, Math.max(0, number)) : 50;
  };
  return { x: read(parts[0] || undefined), y: read(parts[1]) };
}

export function focalText(x: number, y: number): string {
  const round = (n: number) => Math.round(Math.min(100, Math.max(0, n)));
  return `${round(x)}% ${round(y)}%`;
}
