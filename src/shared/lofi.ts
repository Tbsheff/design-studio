import type { CanvasFile } from './canvas-file';

export const LOFI_STYLE_ID = 'studio-lofi-preview';
export const LOFI_FONT_FAMILY = 'Studio Lofi Hand';

export function lofiCss(fontDataUrl: string): string {
  return [
    `@font-face { font-family: "${LOFI_FONT_FAMILY}"; src: url("${fontDataUrl}") format("woff2"); font-weight: 100 900; font-style: normal; font-display: block; }`,
    'html { filter: grayscale(1) !important; }',
    `html, html *, html *::before, html *::after { font-family: "${LOFI_FONT_FAMILY}", "Comic Sans MS", "Chalkboard SE", cursive !important; }`,
  ].join('\n');
}

export function withLofi(file: CanvasFile, directionId: string, on: boolean): CanvasFile | null {
  const has = file.lofi.includes(directionId);
  if (has === on) return null;
  return { ...file, lofi: on ? [...file.lofi, directionId].sort() : file.lofi.filter((id) => id !== directionId) };
}
