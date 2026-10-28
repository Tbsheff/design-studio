import { clampRgb, differenceEuclidean, formatHex, modeHsl, modeLab, modeLch, modeOklab, modeOklch, modeP3, modeRgb, parse, useMode, type Color } from 'culori/fn';

useMode(modeRgb);
useMode(modeHsl);
useMode(modeLab);
useMode(modeLch);
useMode(modeOklab);
useMode(modeOklch);
useMode(modeP3);

export const COLOR_NEAR_DELTA = 0.006;
const ALPHA_DELTA = 0.02;
const distance = differenceEuclidean('oklab');

function srgbOf(value: string): Color | null {
  try {
    const color = parse(value.trim());
    return color ? clampRgb(color) : null;
  } catch {
    return null;
  }
}

export function nearColor(a: string, b: string, delta = COLOR_NEAR_DELTA): boolean {
  const left = srgbOf(a);
  const right = srgbOf(b);
  if (!left || !right) return false;
  if (Math.abs((left.alpha ?? 1) - (right.alpha ?? 1)) > ALPHA_DELTA) return false;
  return distance(left, right) <= delta;
}

export function hexOf(value: string): string | null {
  const color = srgbOf(value);
  if (!color) return null;
  const hex = formatHex(color);
  const alpha = color.alpha ?? 1;
  return alpha < 1 ? `${hex}${Math.round(alpha * 255).toString(16).padStart(2, '0')}` : hex;
}
