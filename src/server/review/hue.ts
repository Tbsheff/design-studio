import { converter, parse, type Color } from 'culori';

const toHsl = converter('hsl');
const TINTED = 0.15;
const KEEP_SATURATION = 0.4;
const HUE_SPAN = 40;

function hsl(value: string | Color) {
  const color = typeof value === 'string' ? parse(value) : value;
  return color ? toHsl(color) : undefined;
}

function hueGap(a: number, b: number): number {
  return Math.abs((((a - b) % 360) + 540) % 360 - 180);
}

export function keepsHue(source: string | Color, target: string | Color): boolean {
  const from = hsl(source);
  const to = hsl(target);
  if (!from || !to) return true;
  const fromS = from.s ?? 0;
  if (fromS < TINTED || from.l > 0.98 || from.l < 0.03) return true;
  if ((to.s ?? 0) < Math.max(0.1, fromS * KEEP_SATURATION)) return false;
  return hueGap(from.h ?? 0, to.h ?? 0) <= HUE_SPAN;
}
